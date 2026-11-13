import React, { useEffect, useMemo } from 'react';
import { showToast } from '@/shared/feedback/uiFeedback';
import { useStorageRefresh, useStaffScope } from '@/hooks';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import { resolveBookingUi } from './bookingIndustryAdapter';
import { ScheduleService } from '@/core/services/scheduleService';
import { StorageService } from '@/services/storage';
import type { Booking, BookingStatus } from '@/core/types/schedule';
import { BOOKING_STATUS_LABEL } from '@/core/schedules/bookingStatusLabel';
import { bookingChangeNotice } from '@/core/schedules/bookingChangeNotice';
import { buildSlotOccupancyIndex, getSlotCapacityInfo } from '@/capabilities/scheduling/capacity';
import { isOutsideStaffHours } from '@/capabilities/scheduling/availability/windows';
import { confirmBookingDeposit } from '@/core/schedules/confirmBookingDeposit';
import { CapacitySlotList } from './CapacitySlotList';
import { BookingFormModal } from './BookingFormModal';
import { getConfiguredRooms } from '@/core/organizations/utils/academyRooms';
import {
  findStaffTimeConflict,
  findTreatmentRoomConflict,
} from '@/capabilities/booking/domain/bookingRooms';
import { rescheduleBooking } from '@/capabilities/booking/domain/rescheduleBooking';
import { notifyBookingChange } from '@/capabilities/booking';
import { validateScheduleConstraints } from '@/capabilities/scheduling/domain/calendarConstraintEngine';
import { EmptyState, FilterTabs, Modal, PageHeader, UnifiedScheduleCalendar, type CalendarEventItem, type CalendarResourceColumn, type CalendarSlotTarget } from '@/shared/components';
import { Calendar, List, Users, Eye, EyeOff, UserCheck, ShieldAlert } from 'lucide-react';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import {
  filterAndSanitizeSchedulesForViewer,
  type ScheduleViewMode,
  type StaffScheduleProfile,
  type ScheduleVisibility,
} from '@/core/schedules/domain/scheduleVisibilityEngine';
import { executeBookingCreate } from './executeBookingCreate';
import { mergeScopedBookingsWithInbox, useBookingFilters } from './useBookingFilters';
import { useBookingForm } from './useBookingForm';
import { enqueueTurnaroundAfterBookingEnd } from '@/capabilities/booking/domain/bookingTurnaroundBridge';

export const BookingCalendarView: React.FC = () => {
  const { industry, isOwner, isAdmin, isStaff } = usePermissions();
  const { currentOrganization } = useOrganization();
  const labels = useModuleLabels();
  const bookingUi = resolveBookingUi(industry);
  const appointment = bookingUi.flow === 'appointmentCards';
  const classSlots = bookingUi.flow === 'classSlots';
  const staffLabel = labels.staff.singular;
  const customerLabel = labels.customer.singular;
  const serviceLabel = labels.service.management;
  const accentBtn = bookingUi.calendarAccentBtn;
  const accentTab = bookingUi.calendarAccentTab;
  const accentText = bookingUi.calendarAccentText;
  const refreshKey = useStorageRefresh('bookings');
  const { isScoped, staffId, scopeMembersForPilates } = useStaffScope();

  // 동료 스케줄 상호 조회 / 오버레이 필터 모드
  const [scheduleScopeMode, setScheduleScopeMode] = React.useState<ScheduleViewMode>(
    isScoped ? 'my_only' : 'all'
  );
  const [selectedStaffIds, setSelectedStaffIds] = React.useState<string[]>([]);

  const form = useBookingForm({ isScoped, staffId });

  const allBookingsRaw = ScheduleService.getBookings();
  const recruitments = ScheduleService.getSlotRecruitments();
  const occupancyIndex = useMemo(
    () => buildSlotOccupancyIndex(allBookingsRaw),
    [allBookingsRaw, refreshKey]
  );

  const instructors = StorageService.getTeachers().filter((t) => t.status === 'active');
  const services = ScheduleService.getActiveServiceOfferings();
  const treatmentRooms = useMemo(
    () => getConfiguredRooms(StorageService.getSettings()).filter((room) => room.kind === 'treatment'),
    [refreshKey]
  );

  const staffProfiles = useMemo<StaffScheduleProfile[]>(() => {
    return instructors.map((t) => ({
      id: t.id,
      name: t.name,
      organizationId: t.organizationId || currentOrganization?.id || '',
      roleTitle: t.roleTitle || t.specialty,
      defaultVisibility: (t.defaultScheduleVisibility as ScheduleVisibility) || 'PUBLIC',
      color: t.color,
    }));
  }, [instructors, currentOrganization?.id]);

  const processedScheduleItems = useMemo(() => {
    return filterAndSanitizeSchedulesForViewer<Booking>({
      viewer: {
        id: staffId,
        role: isOwner ? 'owner' : isAdmin ? 'admin' : isStaff ? 'staff' : 'customer',
        organizationId: currentOrganization?.id || '',
      },
      schedules: allBookingsRaw,
      staffProfiles,
      viewMode: scheduleScopeMode,
      selectedStaffIds,
      maskCustomerPIIOnPublic: !isOwner && !isAdmin,
    });
  }, [
    staffId,
    isOwner,
    isAdmin,
    isStaff,
    currentOrganization?.id,
    allBookingsRaw,
    staffProfiles,
    scheduleScopeMode,
    selectedStaffIds,
    refreshKey,
  ]);

  const processedMap = useMemo(() => {
    return new Map(processedScheduleItems.map((p) => [p.original.id, p]));
  }, [processedScheduleItems]);

  const allBookings = useMemo(() => {
    const sanitizedList = processedScheduleItems.map((p) => p.sanitized);
    return mergeScopedBookingsWithInbox({
      scoped: sanitizedList,
      allRaw: allBookingsRaw,
      skin: appointment,
      isScoped: scheduleScopeMode === 'my_only',
    });
  }, [processedScheduleItems, allBookingsRaw, appointment, scheduleScopeMode]);

  const members = useMemo(
    () =>
      scopeMembersForPilates(
        StorageService.getStudents().filter((s) => s.status === 'active'),
        allBookingsRaw
      ),
    [allBookingsRaw, scopeMembersForPilates, refreshKey]
  );

  const {
    filter,
    setFilter,
    instructorFilter,
    setInstructorFilter,
    instructorTabs,
    filtered,
    presetRecruitments,
    timeFilters,
  } = useBookingFilters({
    skin: appointment,
    isScoped,
    staffId,
    staffLabel,
    instructors,
    allBookings,
    recruitments,
  });

  useEffect(() => {
    if (isScoped && staffId) {
      setInstructorFilter(staffId);
    }
  }, [isScoped, staffId, setInstructorFilter]);

  const selectedService = services.find((s) => s.id === form.serviceId);
  const draftStartsAt = `${form.date}T${form.time}:00`;
  const draftCapacity =
    selectedService &&
    form.resolvedFormStaffId &&
    getSlotCapacityInfo({
      service: selectedService,
      staffId: form.resolvedFormStaffId,
      startsAt: draftStartsAt,
      bookings: allBookingsRaw,
      recruitments,
    });

  const [displayMode, setDisplayMode] = React.useState<'calendar' | 'list'>('calendar');
  const [selectedBookingForDetail, setSelectedBookingForDetail] = React.useState<Booking | null>(null);

  const resourceColumns: CalendarResourceColumn[] = useMemo(() => {
    if (treatmentRooms.length > 0) {
      return treatmentRooms.map((r) => ({
        id: r.id,
        name: r.name,
        category: 'room' as const,
      }));
    }
    return instructors.map((inst) => ({
      id: inst.id,
      name: inst.name,
      category: 'staff' as const,
    }));
  }, [treatmentRooms, instructors]);

  const calendarEvents: CalendarEventItem<Booking>[] = useMemo(() => {
    return allBookings.map((b) => {
      const service =
        services.find((s) => s.id === b.serviceId) ??
        ScheduleService.getServiceOfferings().find((s) => s.id === b.serviceId);
      const capacity =
        service && b.serviceId && b.staffId
          ? getSlotCapacityInfo({
              service,
              staffId: b.staffId,
              startsAt: b.startsAt,
              bookings: allBookingsRaw,
              recruitments,
              occupancyIndex,
            })
          : null;

      const date = b.startsAt.slice(0, 10);
      const startTime = b.startsAt.slice(11, 16);
      const endTime = b.endsAt.slice(11, 16);
      const proc = processedMap.get(b.id);
      const isEditable = proc ? proc.canEdit : (!isScoped || b.staffId === staffId);
      const isInactive = b.status === 'completed' || b.status === 'cancelled';
      const colorTheme = proc?.colorTheme || (appointment ? 'rose' : 'teal');
      const title = proc?.displayTitle || b.customerName;
      const subtitle =
        proc?.displaySubtitle ||
        `${b.serviceName || bookingUi.sessionNoun || '예약'} · ${b.staffName || `${staffLabel} 미지정`}${b.roomName ? ` · ${b.roomName}` : ''}`;

      return {
        id: b.id,
        title,
        subtitle,
        date,
        startTime,
        endTime,
        staffId: b.staffId,
        staffName: b.staffName,
        roomId: b.roomId,
        roomName: b.roomName,
        status: b.status,
        colorTheme,
        isDraggable: isEditable && !isInactive,
        isResizable: isEditable && !isInactive,
        capacity: capacity
          ? {
              current: capacity.occupied,
              max: capacity.maxCapacity,
              isClosed: capacity.isClosed,
            }
          : undefined,
        raw: b,
      };
    });
  }, [
    allBookings,
    processedMap,
    services,
    allBookingsRaw,
    recruitments,
    occupancyIndex,
    isScoped,
    staffId,
    appointment,
    bookingUi.sessionNoun,
    staffLabel,
  ]);

  const handleCalendarEventMove = async (
    event: CalendarEventItem<Booking>,
    target: CalendarSlotTarget
  ) => {
    if (!target.date || !target.startTime) return false;
    const duration =
      new Date(event.raw.endsAt).getTime() - new Date(event.raw.startsAt).getTime();
    const startsAt = `${target.date}T${target.startTime}:00`;
    const endsAt = new Date(
      new Date(startsAt).getTime() + Math.max(duration, 30 * 60 * 1000)
    )
      .toISOString()
      .slice(0, 19);

    // 3중 제약조건 사전 검증 (직원 근무표, 룸 중복, 고객 수강권)
    const constraintCheck = validateScheduleConstraints(
      {
        bookingId: event.id,
        memberId: event.raw.customerId,
        staffId: target.staffId ?? event.staffId,
        roomId: target.roomId ?? event.roomId,
        date: target.date,
        startTime: target.startTime,
        endTime: endsAt.slice(11, 16),
      },
      {
        existingBookings: allBookingsRaw.map((b) => ({
          id: b.id,
          memberId: b.customerId,
          staffId: b.staffId,
          roomId: b.roomId,
          date: b.startsAt.slice(0, 10),
          startTime: b.startsAt.slice(11, 16),
          endTime: b.endsAt.slice(11, 16),
          status: b.status as any,
        })),
        allowWarningPass: true,
      }
    );

    if (!constraintCheck.isValid && constraintCheck.violations.length > 0) {
      const topViolation = constraintCheck.violations[0];
      showToast(`[일정 변경 불가] ${topViolation.message}`, 'warning');
      return false;
    }

    const result = rescheduleBooking({
      bookingId: event.id,
      startsAt,
      endsAt,
      staffId: target.staffId ?? event.staffId,
      roomId: target.roomId ?? event.roomId,
    });

    if (!result.ok) {
      if (result.message) showToast(result.message, 'warning');
      return false;
    }
    showToast('예약 일정을 변경했습니다.', 'success');
    return true;
  };

  const handleCalendarEventResize = async (
    event: CalendarEventItem<Booking>,
    target: { endTime: string }
  ) => {
    const date = event.date || event.raw.startsAt.slice(0, 10);
    const startsAt = event.raw.startsAt;
    const endsAt = `${date}T${target.endTime}:00`;

    const result = rescheduleBooking({
      bookingId: event.id,
      startsAt,
      endsAt,
    });

    if (!result.ok) {
      if (result.message) showToast(result.message, 'warning');
      return false;
    }
    showToast('예약 이용 시간을 변경했습니다.', 'success');
    return true;
  };

  const handleCalendarSlotClick = (slot: CalendarSlotTarget) => {
    form.openCreateModalWithSlot({
      date: slot.date,
      time: slot.startTime,
      staffId: slot.staffId,
      roomId: slot.roomId,
    });
  };

  const memberRemaining = form.memberId
    ? ScheduleService.getCustomerRemainingSessions(form.memberId)
    : null;

  useEffect(() => {
    if (!classSlots || !selectedService) return;
    form.setSlotCapacity(
      String(draftCapacity ? draftCapacity.maxCapacity : selectedService.maxCapacity || 1)
    );
  }, [
    classSlots,
    selectedService?.id,
    selectedService?.maxCapacity,
    draftCapacity?.maxCapacity,
    form.resolvedFormStaffId,
    draftStartsAt,
  ]);

  const saveSlotCapacity = (
    serviceIdValue: string,
    staffIdValue: string,
    startsAt: string,
    nextValue: number
  ) => {
    const service =
      services.find((item) => item.id === serviceIdValue) ??
      ScheduleService.getServiceOfferings().find((item) => item.id === serviceIdValue);
    if (!service) return false;
    const occupied = getSlotCapacityInfo({
      service,
      staffId: staffIdValue,
      startsAt,
      bookings: ScheduleService.getBookings(),
      recruitments: ScheduleService.getSlotRecruitments(),
    }).occupied;
    if (nextValue < occupied) {
      showToast('현재 모인 인원보다 작게 줄일 수 없습니다.', 'warning');
      return false;
    }
    ScheduleService.setSlotRecruitmentCapacity(serviceIdValue, staffIdValue, startsAt, nextValue);
    return true;
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classSlots && !appointment) {
      showToast('이 업종에는 예약 규칙이 없어 등록할 수 없습니다.', 'warning');
      return;
    }
    const result = executeBookingCreate({
      skin: appointment,
      form: form.snapshot(),
      members,
      services,
      instructors,
      treatmentRooms,
      labels: {
        customer: customerLabel,
        staff: staffLabel,
        service: serviceLabel,
      },
      getBookings: () => ScheduleService.getBookings(),
      getRecruitments: () => ScheduleService.getSlotRecruitments(),
      getStaffHours: () => StorageService.getSettings().staffHours,
      remainingSessions: (id) => ScheduleService.getCustomerRemainingSessions(id),
      applySlotCapacity: (svcId, stId, starts, next) =>
        saveSlotCapacity(svcId, stId, starts, next),
      saveBooking: (payload) => {
        ScheduleService.saveBooking({
          ...payload,
          status: 'scheduled',
          requestedBy: 'staff',
        });
      },
    });

    if (result.ok === false) {
      if (result.message) showToast(result.message, 'warning');
      return;
    }
    showToast(`${result.staffName} ${staffLabel} 예약이 등록되었습니다.`, 'success');
    form.closeCreateModal();
  };

  const assignCustomerRequest = (
    booking: Booking,
    patch: { staffId?: string; roomId?: string }
  ) => {
    const nextStaffId = patch.staffId !== undefined ? patch.staffId : booking.staffId || '';
    const nextRoomId = patch.roomId !== undefined ? patch.roomId : booking.roomId || '';
    const instructor = instructors.find((t) => t.id === nextStaffId);
    const room = treatmentRooms.find((item) => item.id === nextRoomId);
    const service =
      services.find((s) => s.id === booking.serviceId) ??
      ScheduleService.getServiceOfferings().find((s) => s.id === booking.serviceId);

    if (isScoped && staffId && nextStaffId && nextStaffId !== staffId) {
      showToast('본인 예약으로만 가져갈 수 있습니다.', 'warning');
      return;
    }

    if (
      instructor &&
      isOutsideStaffHours({
        staffId: instructor.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        windows: StorageService.getSettings().staffHours,
      })
    ) {
      showToast(`${instructor.name} 근무시간이 아닙니다.`, 'warning');
      return;
    }

    if (instructor) {
      const staffConflict = findStaffTimeConflict({
        staffId: instructor.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        bookings: ScheduleService.getBookings(),
        ignoreId: booking.id,
      });
      if (staffConflict) {
        showToast(`${instructor.name}은 이 시간에 이미 예약이 있습니다.`, 'warning');
        return;
      }
    }

    if (instructor && service) {
      const capacity = getSlotCapacityInfo({
        service,
        staffId: instructor.id,
        startsAt: booking.startsAt,
        bookings: ScheduleService.getBookings().filter((item) => item.id !== booking.id),
        recruitments: ScheduleService.getSlotRecruitments(),
      });
      if (capacity.isClosed) {
        showToast('선택한 관리사 시간대는 배정할 수 없습니다.', 'warning');
        return;
      }
    }

    if (room) {
      const conflict = findTreatmentRoomConflict({
        roomId: room.id,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        bookings: ScheduleService.getBookings(),
        ignoreId: booking.id,
      });
      if (conflict) {
        showToast(`${room.name}은 이 시간에 이미 예약되어 있습니다.`, 'warning');
        return;
      }
    }

    ScheduleService.saveBooking({
      ...booking,
      staffId: instructor?.id,
      staffName: instructor?.name,
      roomId: room?.id,
      roomName: room?.name,
    });
    showToast('신청 배정을 저장했습니다.', 'success');
  };

  const notifyCustomer = (booking: Booking, title: string, message: string) => {
    if (bookingUi.notifyOnStatus.length === 0) return;
    const student = StorageService.getStudents().find((item) => item.id === booking.customerId);
    notifyBookingChange({
      studentId: booking.customerId,
      studentName: booking.customerName,
      parentPhone: student?.phone,
      title,
      message,
      date: booking.startsAt.slice(0, 10),
    });
  };

  const handleLegacyReschedule = (booking: Booking, time: string) => {
    if (!appointment || !time) return;
    const duration = new Date(booking.endsAt).getTime() - new Date(booking.startsAt).getTime();
    const startsAt = `${booking.startsAt.slice(0, 10)}T${time}:00`;
    const endsAt = new Date(new Date(startsAt).getTime() + Math.max(duration, 0)).toISOString().slice(0, 19);
    const res = rescheduleBooking({
      bookingId: booking.id,
      startsAt,
      endsAt,
      staffId: booking.staffId,
      staffName: booking.staffName,
      roomId: booking.roomId,
      roomName: booking.roomName,
    });
    if (!res.ok && res.message) {
      showToast(res.message, 'warning');
    } else if (res.ok) {
      showToast('예약 시간을 변경했습니다.', 'success');
    }
  };

  const promoteWaitlist = (booking: Booking) => {
    if (!booking.staffId) {
      showToast('일반 신청으로 올리기 전에 관리사를 배정해 주세요.', 'warning');
      return;
    }
    if (
      isOutsideStaffHours({
        staffId: booking.staffId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        windows: StorageService.getSettings().staffHours,
      })
    ) {
      showToast('관리사 근무시간이 아닙니다.', 'warning');
      return;
    }
    const conflict = findStaffTimeConflict({
      staffId: booking.staffId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      bookings: ScheduleService.getBookings(),
      ignoreId: booking.id,
    });
    if (conflict) {
      showToast('이 시간에 다른 예약이 있어 올릴 수 없습니다.', 'warning');
      return;
    }
    if (booking.roomId) {
      const roomConflict = findTreatmentRoomConflict({
        roomId: booking.roomId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        bookings: ScheduleService.getBookings(),
        ignoreId: booking.id,
      });
      if (roomConflict) {
        showToast('이 시간에 룸이 이미 예약되어 올릴 수 없습니다.', 'warning');
        return;
      }
    }
    ScheduleService.saveBooking({ ...booking, waitlist: false });
    showToast('대기 신청을 일반 신청으로 올렸습니다.', 'success');
  };

  const updateStatus = async (booking: Booking, status: BookingStatus) => {
    if (appointment && status === 'confirmed' && booking.waitlist) {
      showToast('대기 신청은 일반 신청으로 올린 뒤 확정하세요.', 'warning');
      return;
    }
    if (appointment && status === 'confirmed' && !booking.staffId) {
      showToast('확정 전에 관리사를 배정해 주세요.', 'warning');
      return;
    }
    if (
      appointment &&
      status === 'confirmed' &&
      booking.staffId &&
      isOutsideStaffHours({
        staffId: booking.staffId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        windows: StorageService.getSettings().staffHours,
      })
    ) {
      showToast('관리사 근무시간이 아니어서 확정할 수 없습니다.', 'warning');
      return;
    }
    if (appointment && status === 'confirmed' && booking.staffId) {
      const staffConflict = findStaffTimeConflict({
        staffId: booking.staffId,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        bookings: ScheduleService.getBookings(),
        ignoreId: booking.id,
      });
      if (staffConflict) {
        showToast('이 관리사는 해당 시간에 다른 예약이 있어 확정할 수 없습니다.', 'warning');
        return;
      }
    }
    let result: Booking | null;
    try {
      result = await ScheduleService.updateBookingStatus(
        booking.id,
        status,
        bookingUi.consumePassOnNoShow ? { consumeOnNoShow: true } : undefined
      );
    } catch (err) {
      showToast.error(err, '상태 변경에 실패했습니다.');
      return;
    }
    if (!result) {
      const deducting =
        status === 'completed' || (bookingUi.consumePassOnNoShow && status === 'no_show');
      showToast(
        deducting
          ? '이용권 잔여가 없어 완료/결석 처리할 수 없습니다.'
          : '상태 변경에 실패했습니다.',
        'error'
      );
      return;
    }
    if (
      status === 'completed' &&
      currentOrganization?.id &&
      (booking.roomId || result.roomId)
    ) {
      const roomId = booking.roomId || result.roomId || '';
      const roomName =
        treatmentRooms.find((room) => room.id === roomId)?.name || roomId || '공간';
      void enqueueTurnaroundAfterBookingEnd({
        organizationId: currentOrganization.id,
        roomId,
        roomName,
        bookingId: booking.id,
        serviceStartAt: booking.startsAt,
        serviceEndAt: booking.endsAt,
        organizationSettings: (currentOrganization.settings ?? null) as Record<string, unknown> | null,
      }).catch(() => {
        /* 턴어라운드 생성 실패는 예약 완료를 막지 않음 */
      });
    }
    const notice = bookingChangeNotice(booking, status, bookingUi.sessionNoun || '예약');
    const shouldNotify = bookingUi.notifyOnStatus.includes(status);
    if (notice && shouldNotify) notifyCustomer(booking, notice.title, notice.message);
    if (status === 'completed' && appointment && !booking.skinCondition && !booking.chartNote) {
      showToast('시술 기록이 없습니다. 고객 상세의 시술 기록에서 작성할 수 있습니다.', 'info');
    } else if (
      (status === 'completed' || (bookingUi.consumePassOnNoShow && status === 'no_show')) &&
      !booking.sessionPassId &&
      !result.sessionPassId
    ) {
      showToast(
        `예약 상태가 '${BOOKING_STATUS_LABEL[status]}'(으)로 변경되었습니다. (이용권 잔여 없음)`,
        'info'
      );
      return;
    } else {
      showToast(`예약 상태가 '${BOOKING_STATUS_LABEL[status]}'(으)로 변경되었습니다.`, 'info');
    }
  };

  const completeClass = async (group: { bookings: Booking[] }) => {
    const targets = group.bookings.filter(
      (booking) => booking.status === 'scheduled' || booking.status === 'confirmed'
    );
    if (targets.length === 0) return;
    let missingPass = 0;
    let blocked = 0;
    for (const booking of targets) {
      let result: Booking | null;
      try {
        result = await ScheduleService.updateBookingStatus(booking.id, 'completed', {
          consumeOnNoShow: true,
        });
      } catch {
        blocked += 1;
        continue;
      }
      if (!result) {
        blocked += 1;
        continue;
      }
      if (!booking.sessionPassId && !result.sessionPassId) missingPass += 1;
      const notice = bookingChangeNotice(booking, 'completed', bookingUi.sessionNoun || '수업');
      if (notice) notifyCustomer(booking, notice.title, notice.message);
    }
    if (blocked > 0 && blocked === targets.length) {
      showToast('이용권 잔여가 없어 참석 완료 처리할 수 없습니다.', 'error');
      return;
    }
    showToast(
      blocked > 0
        ? `참석 완료 ${targets.length - blocked}명, 이용권 부족으로 제외 ${blocked}명`
        : missingPass > 0
          ? `참석 완료로 닫았습니다. 이용권 잔여 없음 ${missingPass}명`
          : '참석 완료로 닫았습니다.',
      blocked > 0 || missingPass > 0 ? 'info' : 'success'
    );
  };

  const setGroupCapacity = (
    group: { serviceId: string; staffId: string; startsAt: string; staffName: string },
    next: number
  ) => {
    const service =
      services.find((item) => item.id === group.serviceId) ??
      ScheduleService.getServiceOfferings().find((item) => item.id === group.serviceId);
    if (!service || !saveSlotCapacity(service.id, group.staffId, group.startsAt, next)) return;
    showToast('이 시간대 정원을 저장했습니다.', 'success');
  };

  const toggleGroupClosed = (group: {
    serviceId: string;
    staffId: string;
    startsAt: string;
    staffName: string;
  }) => {
    const service =
      services.find((item) => item.id === group.serviceId) ??
      ScheduleService.getServiceOfferings().find((item) => item.id === group.serviceId);
    if (!service || !group.staffId) return;
    const info = getSlotCapacityInfo({
      service,
      staffId: group.staffId,
      startsAt: group.startsAt,
      bookings: allBookingsRaw,
      recruitments,
    });
    ScheduleService.setSlotRecruitmentClosed(
      group.serviceId,
      group.staffId,
      group.startsAt,
      !info.closedManually
    );
    showToast(
      !info.closedManually
        ? `${group.staffName || staffLabel} 시간대 모집을 마감했습니다.`
        : '모집을 다시 열었습니다.',
      'success'
    );
  };

  const saveCapacityOnly = () => {
    const service = services.find((item) => item.id === form.serviceId);
    if (!service || !form.resolvedFormStaffId) {
      showToast(`${staffLabel}와 ${serviceLabel}을 선택해 주세요.`, 'warning');
      return;
    }
    const nextCapacity = Number(form.slotCapacity);
    if (!nextCapacity) {
      showToast('정원을 입력해 주세요.', 'warning');
      return;
    }
    if (!saveSlotCapacity(service.id, form.resolvedFormStaffId, draftStartsAt, nextCapacity))
      return;
    showToast('이 시간대 정원을 저장했습니다. 회원이 없어도 유지됩니다.', 'success');
  };

  const toggleRecruitment = (booking: Booking) => {
    if (!booking.serviceId || !booking.staffId) {
      showToast(`${staffLabel}가 지정된 예약만 모집 마감할 수 있습니다.`, 'warning');
      return;
    }
    const service =
      services.find((s) => s.id === booking.serviceId) ??
      ScheduleService.getServiceOfferings().find((s) => s.id === booking.serviceId);
    if (!service) return;
    const info = getSlotCapacityInfo({
      service,
      staffId: booking.staffId,
      startsAt: booking.startsAt,
      bookings: allBookingsRaw,
      recruitments,
    });
    ScheduleService.setSlotRecruitmentClosed(
      booking.serviceId,
      booking.staffId,
      booking.startsAt,
      !info.closedManually
    );
    showToast(
      !info.closedManually
        ? `${booking.staffName || staffLabel} 시간대 모집을 마감했습니다.`
        : '모집을 다시 열었습니다.',
      'success'
    );
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<span className="text-xl">📅</span>}
        iconClassName="text-teal-600"
        title={labels.schedule.management}
        description={`${staffLabel}별로 같은 시간이라도 따로 예약·정원·모집 마감됩니다`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => setDisplayMode('calendar')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  displayMode === 'calendar'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                캘린더
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('list')}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  displayMode === 'list'
                    ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                    : 'hover:text-slate-900'
                }`}
              >
                <List className="w-4 h-4" />
                목록
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!classSlots && !appointment) {
                  showToast('이 업종에는 예약 규칙이 없어 등록할 수 없습니다.', 'warning');
                  return;
                }
                form.openCreateModal();
              }}
              className={`px-4 py-2.5 ${accentBtn} text-white text-sm font-bold rounded-xl min-h-[44px] cursor-pointer`}
            >
              + 예약 등록
            </button>
          </div>
        }
      />

      {/* 동료 스케줄 상호 조회 및 가시성 제어 필터 바 */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 sm:p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800">동료 스케줄 조회 범위</span>
              <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">
                (공개 일정 및 바쁨 상태 자동 동기화)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => {
                setScheduleScopeMode('my_only');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                scheduleScopeMode === 'my_only'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              내 일정만 보기
            </button>
            <button
              type="button"
              onClick={() => {
                setScheduleScopeMode('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                scheduleScopeMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              전체 동료 일정 함께 보기
            </button>
            <button
              type="button"
              onClick={() => {
                setScheduleScopeMode('custom_staff');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                scheduleScopeMode === 'custom_staff'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              직원 다중 선택
              {selectedStaffIds.length > 0 && ` (${selectedStaffIds.length}명)`}
            </button>
          </div>
        </div>

        {/* 특정 직원 다중 선택 칩 영역 */}
        {scheduleScopeMode === 'custom_staff' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">표시할 직원:</span>
            {instructors.map((inst) => {
              const isSelected = selectedStaffIds.includes(inst.id);
              return (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => {
                    setSelectedStaffIds((prev) =>
                      isSelected ? prev.filter((id) => id !== inst.id) : [...prev, inst.id]
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-slate-400'
                    }`}
                  />
                  <span>{inst.name}</span>
                  {inst.roleTitle && (
                    <span
                      className={`text-[10px] ${
                        isSelected ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      ({inst.roleTitle})
                    </span>
                  )}
                </button>
              );
            })}
            {instructors.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedStaffIds.length === instructors.length) {
                    setSelectedStaffIds([]);
                  } else {
                    setSelectedStaffIds(instructors.map((i) => i.id));
                  }
                }}
                className="text-[11px] text-indigo-600 hover:underline font-bold ml-1.5 cursor-pointer"
              >
                {selectedStaffIds.length === instructors.length ? '전체 해제' : '전체 선택'}
              </button>
            )}
          </div>
        )}
      </div>

      {displayMode === 'calendar' ? (
        <UnifiedScheduleCalendar<Booking>
          mode="appointment_timeline"
          availableViews={['month', 'week', 'day', 'timeline']}
          events={calendarEvents}
          resources={resourceColumns}
          onEventMove={handleCalendarEventMove}
          onEventResize={handleCalendarEventResize}
          onSlotClick={handleCalendarSlotClick}
          onEventClick={(ev) => setSelectedBookingForDetail(ev.raw)}
        />
      ) : (
        <>
          {!isScoped && instructors.length > 0 && (
            <FilterTabs
              tabs={instructorTabs}
              active={instructorFilter}
              onChange={setInstructorFilter}
              activeClassName={accentTab}
            />
          )}

          <FilterTabs
            tabs={timeFilters}
            active={filter}
            onChange={setFilter}
            activeClassName={accentTab}
          />

      {classSlots ? (
        filtered.length === 0 && presetRecruitments.length === 0 ? (
          <EmptyState icon={<span className="text-3xl">📭</span>} title="예약 내역이 없습니다" />
        ) : (
        <CapacitySlotList
          bookings={filtered}
          allBookings={allBookingsRaw}
          services={ScheduleService.getServiceOfferings()}
          recruitments={recruitments}
          presetRecruitments={presetRecruitments}
          staffNameById={Object.fromEntries(instructors.map((item) => [item.id, item.name]))}
          canEditSlot={(id) => !isScoped || id === staffId}
          onSetCapacity={setGroupCapacity}
          onToggleClosed={toggleGroupClosed}
          onUpdateStatus={updateStatus}
          onCompleteClass={completeClass}
        />
        )
      ) : appointment ? (
        filtered.length === 0 ? (
          <EmptyState icon={<span className="text-3xl">📭</span>} title="예약 내역이 없습니다" />
        ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const service =
              services.find((s) => s.id === b.serviceId) ??
              ScheduleService.getServiceOfferings().find((s) => s.id === b.serviceId);
            const capacity =
              service && b.serviceId && b.staffId
                ? getSlotCapacityInfo({
                    service,
                    staffId: b.staffId,
                    startsAt: b.startsAt,
                    bookings: allBookingsRaw,
                    recruitments,
                    occupancyIndex,
                  })
                : null;

            return (
              <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-900">{b.customerName}</p>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {b.serviceName} · {b.staffName || `${staffLabel} 미지정`}
                      {b.roomName ? ` · ${b.roomName}` : ''}
                    </p>
                    <p className={`text-xs font-semibold mt-1 ${accentText}`}>
                      {b.startsAt.slice(0, 16).replace('T', ' ')} ~ {b.endsAt.slice(11, 16)}
                    </p>
                    {b.memo && (
                      <p className="text-[11px] text-slate-500 mt-1 whitespace-pre-wrap">{b.memo}</p>
                    )}
                    {capacity && (
                      <p
                        className={`text-[11px] font-bold mt-1 ${
                          capacity.isClosed ? 'text-rose-600' : 'text-slate-500'
                        }`}
                      >
                        {b.staffName ? `${b.staffName} · ` : ''}
                        정원 {capacity.occupied}/{capacity.maxCapacity}
                        {capacity.isClosed
                          ? capacity.closedManually
                            ? ' · 모집 마감'
                            : ' · 정원 마감'
                          : ` · 잔여 ${capacity.remaining}자리`}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                      {b.waitlist
                        ? '대기'
                        : b.requestedBy === 'customer' && b.status === 'scheduled'
                          ? '신청'
                          : BOOKING_STATUS_LABEL[b.status]}
                    </span>
                    {appointment && b.status === 'no_show' && b.depositStatus === 'confirmed' && (
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800">
                        예약금 미반환
                      </span>
                    )}
                    {appointment && b.depositStatus && b.depositStatus !== 'confirmed' && (
                      <button
                        type="button"
                        onClick={() => {
                          const { createdIncome, income } = confirmBookingDeposit(b);
                          showToast(
                            createdIncome && income
                              ? `예약금 입금 확인 · 수입 ${income.amount.toLocaleString('ko-KR')}원 반영`
                              : '예약금 입금을 확인했습니다.',
                            'success'
                          );
                        }}
                        className="px-2 py-1 text-xs font-bold bg-rose-50 text-rose-700 rounded-lg min-h-[44px]"
                      >
                        입금 확인
                      </button>
                    )}
                    {appointment && b.waitlist && (
                      <button
                        type="button"
                        onClick={() => promoteWaitlist(b)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg min-h-[44px]"
                      >
                        일반 신청으로
                      </button>
                    )}
                    {appointment && (b.status === 'scheduled' || b.status === 'confirmed') && (
                      <input
                        type="time"
                        defaultValue={b.startsAt.slice(11, 16)}
                        aria-label="예약 시간 변경"
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== b.startsAt.slice(11, 16)) {
                            handleLegacyReschedule(b, e.target.value);
                          }
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg min-h-[44px]"
                      />
                    )}
                    {b.serviceId && b.staffId && capacity && (
                      <button
                        type="button"
                        onClick={() => toggleRecruitment(b)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg min-h-[44px]"
                      >
                        {capacity.closedManually ? '모집 재개' : '모집 마감'}
                      </button>
                    )}
                    {appointment && b.requestedBy === 'customer' && b.status === 'scheduled' && (
                      <div className="flex flex-wrap gap-2 w-full">
                        <select
                          value={b.staffId || ''}
                          onChange={(e) => assignCustomerRequest(b, { staffId: e.target.value })}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-lg min-h-[44px] flex-1 min-w-[8rem]"
                          aria-label="희망 관리사"
                        >
                          <option value="">관리사 미지정</option>
                          {(isScoped && staffId
                            ? instructors.filter((t) => t.id === staffId)
                            : instructors
                          ).map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={b.roomId || ''}
                          onChange={(e) => assignCustomerRequest(b, { roomId: e.target.value })}
                          className="px-2 py-1 text-xs border border-slate-200 rounded-lg min-h-[44px] flex-1 min-w-[8rem]"
                          aria-label="관리실"
                        >
                          <option value="">관리실 미지정</option>
                          {treatmentRooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {appointment && (
                      <button
                        type="button"
                        onClick={() => form.openChart(b)}
                        className="px-2 py-1 text-xs font-bold bg-rose-50 text-rose-700 rounded-lg min-h-[44px]"
                      >
                        기록
                      </button>
                    )}
                    {b.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(b, 'confirmed')}
                        className={`px-2 py-1 text-xs font-bold ${bookingUi.statusConfirmBtnClass} text-white rounded-lg min-h-[44px]`}
                      >
                        확정
                      </button>
                    )}
                    {(b.status === 'scheduled' || b.status === 'confirmed') && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateStatus(b, 'completed')}
                          className="px-2 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg min-h-[44px]"
                        >
                          완료
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(b, 'cancelled')}
                          className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg min-h-[44px]"
                        >
                          취소
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState icon={<span className="text-3xl">📭</span>} title="예약 내역이 없습니다" />
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{b.customerName}</p>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {b.serviceName} · {b.staffName || `${staffLabel} 미지정`}
                  </p>
                  <p className={`text-xs font-semibold mt-1 ${accentText}`}>
                    {b.startsAt.slice(0, 16).replace('T', ' ')} ~ {b.endsAt.slice(11, 16)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                    {BOOKING_STATUS_LABEL[b.status]}
                  </span>
                  {b.status === 'scheduled' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(b, 'confirmed')}
                      className={`px-2 py-1 text-xs font-bold ${bookingUi.statusConfirmBtnClass} text-white rounded-lg min-h-[44px]`}
                    >
                      확정
                    </button>
                  )}
                  {(b.status === 'scheduled' || b.status === 'confirmed') && (
                    <>
                      <button
                        type="button"
                        onClick={() => updateStatus(b, 'completed')}
                        className="px-2 py-1 text-xs font-bold bg-emerald-600 text-white rounded-lg min-h-[44px]"
                      >
                        완료
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(b, 'cancelled')}
                        className="px-2 py-1 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg min-h-[44px]"
                      >
                        취소
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      <Modal
        isOpen={Boolean(selectedBookingForDetail)}
        onClose={() => setSelectedBookingForDetail(null)}
        title={selectedBookingForDetail?.isMasked ? '동료 비공개(바쁨) 일정' : '예약 상세 정보'}
      >
        {selectedBookingForDetail && (
          <div className="p-6 space-y-4">
            {selectedBookingForDetail.isMasked ? (
              <div className="space-y-3">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
                  <div className="p-2 bg-slate-200/80 rounded-xl text-slate-600">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">동료 직원의 비공개(바쁨) 일정</h4>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      해당 직원이 상세 정보를 비공개로 설정하였습니다. 슬롯 예약 상태(바쁨)만 공유되며, 고객명·연락처·시술 메모 등 민감 정보는 자동 보호됩니다.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-base font-bold text-slate-900">
                    {selectedBookingForDetail.staffName || '동료 직원'} 일정
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-600 mt-1">
                    {selectedBookingForDetail.startsAt.slice(0, 16).replace('T', ' ')} ~{' '}
                    {selectedBookingForDetail.endsAt.slice(11, 16)}
                  </p>
                  {selectedBookingForDetail.roomName && (
                    <p className="text-xs text-slate-500 mt-1">
                      배정 공간: {selectedBookingForDetail.roomName}
                    </p>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedBookingForDetail(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    확인
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-lg font-black text-slate-900">
                  {selectedBookingForDetail.customerName}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedBookingForDetail.serviceName} · {selectedBookingForDetail.staffName || `${staffLabel} 미지정`}
                  {selectedBookingForDetail.roomName ? ` · ${selectedBookingForDetail.roomName}` : ''}
                </p>
                <p className="text-xs font-mono font-bold text-teal-700 mt-1">
                  {selectedBookingForDetail.startsAt.slice(0, 16).replace('T', ' ')} ~ {selectedBookingForDetail.endsAt.slice(11, 16)}
                </p>
                {selectedBookingForDetail.memo && (
                  <p className="text-xs text-slate-500 mt-2 p-3 bg-slate-50 rounded-xl whitespace-pre-wrap">
                    {selectedBookingForDetail.memo}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                {BOOKING_STATUS_LABEL[selectedBookingForDetail.status]}
              </span>

              {appointment && selectedBookingForDetail.depositStatus && selectedBookingForDetail.depositStatus !== 'confirmed' && (
                <button
                  type="button"
                  onClick={() => {
                    const { createdIncome, income } = confirmBookingDeposit(selectedBookingForDetail);
                    showToast(
                      createdIncome && income
                        ? `예약금 입금 확인 · 수입 ${income.amount.toLocaleString('ko-KR')}원 반영`
                        : '예약금 입금을 확인했습니다.',
                      'success'
                    );
                    setSelectedBookingForDetail(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-rose-50 text-rose-700 rounded-lg min-h-[44px]"
                >
                  입금 확인
                </button>
              )}

              {appointment && selectedBookingForDetail.waitlist && (
                <button
                  type="button"
                  onClick={() => {
                    promoteWaitlist(selectedBookingForDetail);
                    setSelectedBookingForDetail(null);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg min-h-[44px]"
                >
                  일반 신청으로
                </button>
              )}

              {selectedBookingForDetail.status === 'scheduled' && (
                <button
                  type="button"
                  onClick={() => {
                    updateStatus(selectedBookingForDetail, 'confirmed');
                    setSelectedBookingForDetail(null);
                  }}
                  className={`px-3 py-1.5 text-xs font-bold ${bookingUi.statusConfirmBtnClass} text-white rounded-lg min-h-[44px]`}
                >
                  확정
                </button>
              )}

              {(selectedBookingForDetail.status === 'scheduled' || selectedBookingForDetail.status === 'confirmed') && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      updateStatus(selectedBookingForDetail, 'completed');
                      setSelectedBookingForDetail(null);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-lg min-h-[44px]"
                  >
                    완료
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateStatus(selectedBookingForDetail, 'cancelled');
                      setSelectedBookingForDetail(null);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-lg min-h-[44px]"
                  >
                    취소
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <BookingFormModal
        isOpen={form.isModalOpen}
        onClose={form.closeCreateModal}
        skin={appointment}
        isScoped={isScoped}
        staffLabel={staffLabel}
        customerLabel={customerLabel}
        serviceLabel={serviceLabel}
        accentBtn={accentBtn}
        instructors={instructors}
        members={members}
        memberRemainingLabel={(id) =>
          ` (잔여 ${ScheduleService.getCustomerRemainingSessions(id)}회)`
        }
        memberRemaining={memberRemaining}
        services={services}
        treatmentRooms={treatmentRooms}
        formStaffId={form.formStaffId}
        onFormStaffIdChange={form.setFormStaffId}
        resolvedFormStaffId={form.resolvedFormStaffId}
        memberId={form.memberId}
        onMemberIdChange={form.setMemberId}
        serviceId={form.serviceId}
        onServiceIdChange={form.setServiceId}
        date={form.date}
        onDateChange={form.setDate}
        time={form.time}
        onTimeChange={form.setTime}
        slotCapacity={form.slotCapacity}
        onSlotCapacityChange={form.setSlotCapacity}
        roomId={form.roomId}
        onRoomIdChange={form.setRoomId}
        skinCondition={form.skinCondition}
        onSkinConditionChange={form.setSkinCondition}
        chartNote={form.chartNote}
        onChartNoteChange={form.setChartNote}
        selectedService={selectedService}
        draftCapacity={draftCapacity || undefined}
        visibility={form.visibility}
        onVisibilityChange={form.setVisibility}
        onSaveCapacityOnly={saveCapacityOnly}
        onSubmit={handleCreate}
      />

      <Modal
        isOpen={Boolean(form.chartTarget)}
        onClose={form.closeChart}
        title="시술 기록"
      >
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.chartTarget) return;
            ScheduleService.saveBooking({
              ...form.chartTarget,
              skinCondition: form.skinCondition.trim() || undefined,
              chartNote: form.chartNote.trim() || undefined,
            });
            form.closeChart();
            showToast('시술 기록이 저장되었습니다.', 'success');
          }}
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">피부 상태</label>
            <input
              value={form.skinCondition}
              onChange={(e) => form.setSkinCondition(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">시술 메모</label>
            <textarea
              value={form.chartNote}
              onChange={(e) => form.setChartNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-rose-600 text-white font-bold rounded-xl text-sm min-h-[44px]"
          >
            저장
          </button>
        </form>
      </Modal>
    </div>
  );
};
