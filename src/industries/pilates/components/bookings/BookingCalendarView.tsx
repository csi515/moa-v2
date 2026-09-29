import React, { useEffect, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh, useStaffScope } from '@/hooks';
import { usePermissions } from '@/core/auth/usePermissions';
import { useModuleLabels } from '@/core/labels';
import { isPilatesIndustry, isSkinClinicIndustry } from '@/core/industry/industryUi';
import { ScheduleService } from '@/core/services/scheduleService';
import { StorageService } from '@/services/storage';
import type { Booking, BookingStatus } from '@/core/types/schedule';
import { BOOKING_STATUS_LABEL } from '@/core/schedules/bookingStatusLabel';
import { bookingChangeNotice } from '@/core/schedules/bookingChangeNotice';
import { buildSlotOccupancyIndex, getSlotCapacityInfo } from '@/capabilities/scheduling/capacity';
import { isOutsideStaffHours } from '@/capabilities/scheduling/availability/windows';
import { confirmBookingDeposit } from '@/core/schedules/confirmBookingDeposit';
import { PilatesSlotList } from './PilatesSlotList';
import { BookingFormModal } from './BookingFormModal';
import { getConfiguredRooms } from '@/core/academy/utils/academyRooms';
import {
  findStaffTimeConflict,
  findTreatmentRoomConflict,
} from '@/industries/skin/bookingRooms';
import { notifyBookingChange } from '@/core/academy/services/academyAlertService';
import { EmptyState, FilterTabs, Modal, PageHeader } from '@/shared/components';
import { executeBookingCreate } from './executeBookingCreate';
import { mergeScopedBookingsWithInbox, useBookingFilters } from './useBookingFilters';
import { useBookingForm } from './useBookingForm';

export const BookingCalendarView: React.FC = () => {
  const { showToast } = useApp();
  const { industry } = usePermissions();
  const labels = useModuleLabels();
  const skin = isSkinClinicIndustry(industry);
  const staffLabel = labels.staff.singular;
  const customerLabel = labels.customer.singular;
  const serviceLabel = labels.service.management;
  const accentBtn = skin ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-600 hover:bg-teal-700';
  const accentTab = skin ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white';
  const accentText = skin ? 'text-rose-700' : 'text-teal-700';
  const refreshKey = useStorageRefresh('bookings');
  const { isScoped, staffId, scopeBookings, scopeMembersForPilates } = useStaffScope();

  const form = useBookingForm({ isScoped, staffId });

  const allBookingsRaw = ScheduleService.getBookings();
  const recruitments = ScheduleService.getSlotRecruitments();
  const occupancyIndex = useMemo(
    () => buildSlotOccupancyIndex(allBookingsRaw),
    [allBookingsRaw, refreshKey]
  );
  const allBookings = useMemo(() => {
    const scoped = scopeBookings(allBookingsRaw);
    return mergeScopedBookingsWithInbox({
      scoped,
      allRaw: allBookingsRaw,
      skin,
      isScoped,
    });
  }, [allBookingsRaw, scopeBookings, refreshKey, skin, isScoped]);

  const members = useMemo(
    () =>
      scopeMembersForPilates(
        StorageService.getStudents().filter((s) => s.status === 'active'),
        allBookingsRaw
      ),
    [allBookingsRaw, scopeMembersForPilates, refreshKey]
  );
  const instructors = StorageService.getTeachers().filter((t) => t.status === 'active');
  const services = ScheduleService.getActiveServiceOfferings();
  const treatmentRooms = useMemo(
    () => getConfiguredRooms(StorageService.getSettings()).filter((room) => room.kind === 'treatment'),
    [refreshKey]
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
    skin,
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

  const memberRemaining = form.memberId
    ? ScheduleService.getCustomerRemainingSessions(form.memberId)
    : null;

  useEffect(() => {
    if (skin || !selectedService) return;
    form.setSlotCapacity(
      String(draftCapacity ? draftCapacity.maxCapacity : selectedService.maxCapacity || 1)
    );
  }, [
    skin,
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
    const result = executeBookingCreate({
      skin,
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
    if (!skin && !isPilatesIndustry(industry)) return;
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

  const rescheduleBooking = (booking: Booking, time: string) => {
    if (!skin || !time) return;
    const duration = new Date(booking.endsAt).getTime() - new Date(booking.startsAt).getTime();
    const startsAt = `${booking.startsAt.slice(0, 10)}T${time}:00`;
    const endsAt = new Date(new Date(startsAt).getTime() + Math.max(duration, 0)).toISOString();
    if (
      booking.staffId &&
      isOutsideStaffHours({
        staffId: booking.staffId,
        startsAt,
        endsAt,
        windows: StorageService.getSettings().staffHours,
      })
    ) {
      showToast('관리사 근무시간이 아닙니다.', 'warning');
      return;
    }
    if (!booking.waitlist && booking.staffId) {
      const conflict = findStaffTimeConflict({
        staffId: booking.staffId,
        startsAt,
        endsAt,
        bookings: ScheduleService.getBookings(),
        ignoreId: booking.id,
      });
      if (conflict) {
        showToast('이 관리사는 해당 시간에 다른 예약이 있습니다.', 'warning');
        return;
      }
    }
    ScheduleService.saveBooking({ ...booking, startsAt, endsAt });
    notifyCustomer(
      booking,
      '예약 시간 변경',
      `${booking.serviceName || '시술'} 시간이 ${time}으로 변경되었습니다.`
    );
    showToast('예약 시간을 변경했습니다.', 'success');
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
    if (skin && status === 'confirmed' && booking.waitlist) {
      showToast('대기 신청은 일반 신청으로 올린 뒤 확정하세요.', 'warning');
      return;
    }
    if (skin && status === 'confirmed' && !booking.staffId) {
      showToast('확정 전에 관리사를 배정해 주세요.', 'warning');
      return;
    }
    if (
      skin &&
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
    if (skin && status === 'confirmed' && booking.staffId) {
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
        skin ? undefined : { consumeOnNoShow: true }
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : '상태 변경에 실패했습니다.', 'error');
      return;
    }
    if (!result) {
      const deducting = status === 'completed' || (!skin && status === 'no_show');
      showToast(
        deducting
          ? '이용권 잔여가 없어 완료/결석 처리할 수 없습니다.'
          : '상태 변경에 실패했습니다.',
        'error'
      );
      return;
    }
    const notice = bookingChangeNotice(booking, status, skin ? '시술' : '수업');
    const shouldNotify =
      status === 'confirmed' ||
      status === 'cancelled' ||
      (!skin && (status === 'completed' || status === 'no_show'));
    if (notice && shouldNotify) notifyCustomer(booking, notice.title, notice.message);
    if (status === 'completed' && skin && !booking.skinCondition && !booking.chartNote) {
      showToast('시술 기록이 없습니다. 고객 상세의 시술 기록에서 작성할 수 있습니다.', 'info');
    } else if (
      (status === 'completed' || (!skin && status === 'no_show')) &&
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
      const notice = bookingChangeNotice(booking, 'completed', '수업');
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
          <button
            type="button"
            onClick={form.openCreateModal}
            className={`px-4 py-2.5 ${accentBtn} text-white text-sm font-bold rounded-xl min-h-[44px]`}
          >
            + 예약 등록
          </button>
        }
      />

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

      {filtered.length === 0 && (skin || presetRecruitments.length === 0) ? (
        <EmptyState icon={<span className="text-3xl">📭</span>} title="예약 내역이 없습니다" />
      ) : !skin ? (
        <PilatesSlotList
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
                    {skin && b.status === 'no_show' && b.depositStatus === 'confirmed' && (
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-800">
                        예약금 미반환
                      </span>
                    )}
                    {skin && b.depositStatus && b.depositStatus !== 'confirmed' && (
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
                    {skin && b.waitlist && (
                      <button
                        type="button"
                        onClick={() => promoteWaitlist(b)}
                        className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg min-h-[44px]"
                      >
                        일반 신청으로
                      </button>
                    )}
                    {skin && (b.status === 'scheduled' || b.status === 'confirmed') && (
                      <input
                        type="time"
                        defaultValue={b.startsAt.slice(11, 16)}
                        aria-label="예약 시간 변경"
                        onBlur={(e) => {
                          if (e.target.value && e.target.value !== b.startsAt.slice(11, 16)) {
                            rescheduleBooking(b, e.target.value);
                          }
                        }}
                        className="px-2 py-1 text-xs border border-slate-200 rounded-lg min-h-[44px]"
                      />
                    )}
                    {!skin &&
                      b.serviceId &&
                      b.staffId &&
                      capacity &&
                      (!isScoped || b.staffId === staffId) && (
                        <label className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                          정원
                          <input
                            key={`${b.id}-${capacity.maxCapacity}`}
                            type="number"
                            min={Math.max(1, capacity.occupied)}
                            defaultValue={capacity.maxCapacity}
                            aria-label="이 시간대 정원"
                            onBlur={(e) => {
                              const next = Number(e.target.value);
                              if (!next || next === capacity.maxCapacity) return;
                              if (next < capacity.occupied) {
                                showToast('현재 모인 인원보다 작게 줄일 수 없습니다.', 'warning');
                                e.target.value = String(capacity.maxCapacity);
                                return;
                              }
                              ScheduleService.setSlotRecruitmentCapacity(
                                b.serviceId!,
                                b.staffId,
                                b.startsAt,
                                next
                              );
                              showToast('이 시간대 정원을 저장했습니다.', 'success');
                            }}
                            className="w-16 px-2 py-1 text-xs border border-slate-200 rounded-lg min-h-[44px]"
                          />
                        </label>
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
                    {skin && b.requestedBy === 'customer' && b.status === 'scheduled' && (
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
                    {skin && (
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
                        className={`px-2 py-1 text-xs font-bold ${skin ? 'bg-rose-600' : 'bg-teal-600'} text-white rounded-lg min-h-[44px]`}
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
      )}

      <BookingFormModal
        isOpen={form.isModalOpen}
        onClose={form.closeCreateModal}
        skin={skin}
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
