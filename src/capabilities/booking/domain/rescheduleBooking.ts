import { ScheduleService } from '@/core/services/scheduleService';
import { StudentService } from '@/core/students/services/studentService';
import type { Booking } from '@/core/types/schedule';
import type { StaffWorkWindow } from '@/core/staff/workWindow';
import {
  findStaffTimeConflict,
  findTreatmentRoomConflict,
} from '@/capabilities/booking/domain/bookingRooms';
import { isOutsideStaffHours } from '@/capabilities/scheduling/availability/windows';
import { notifyBookingChange } from '@/capabilities/booking/notifications';
import { getSlotCapacityInfo } from '@/capabilities/scheduling/capacity';

export interface RescheduleBookingParams {
  bookingId: string;
  startsAt: string; // ISO string: 'YYYY-MM-DDTHH:mm:00'
  endsAt: string; // ISO string: 'YYYY-MM-DDTHH:mm:00'
  staffId?: string;
  staffName?: string;
  roomId?: string;
  roomName?: string;
  notify?: boolean;
  staffHours?: StaffWorkWindow[];
}

export type RescheduleConflictType =
  | 'not_found'
  | 'inactive_status'
  | 'staff_hours'
  | 'staff_conflict'
  | 'room_conflict'
  | 'capacity_closed';

export interface RescheduleBookingResult {
  ok: boolean;
  booking?: Booking;
  conflictType?: RescheduleConflictType;
  message?: string;
}

/**
 * 예약 일정 재스케줄링 (드래그 앤 드롭 이동 및 시간 조절 전용 도메인 함수)
 *
 * 불변 규칙:
 * 1. 완료(completed) 또는 취소(cancelled)된 예약은 재스케줄링 불가.
 * 2. 회차권 차감/환불 트랜잭션을 트리거하지 않고 시간축(startsAt, endsAt)과 자원(staffId, roomId)만 갱신.
 * 3. 스태프 근무시간, 스태프 시간 충돌, 룸 자원 충돌, 정원 마감 여부를 원자적으로 검증.
 */
export function rescheduleBooking(
  params: RescheduleBookingParams
): RescheduleBookingResult {
  const bookings = ScheduleService.getBookings();
  const existing = bookings.find((b) => b.id === params.bookingId);
  if (!existing) {
    return {
      ok: false,
      conflictType: 'not_found',
      message: '예약 정보를 찾을 수 없습니다.',
    };
  }

  // 1. 상태 검증: 완료 또는 취소된 예약은 이동 불가
  if (existing.status === 'completed' || existing.status === 'cancelled') {
    return {
      ok: false,
      conflictType: 'inactive_status',
      message: '이미 완료되었거나 취소된 예약은 이동할 수 없습니다.',
    };
  }

  const targetStaffId = params.staffId !== undefined ? params.staffId : existing.staffId;
  const targetStaffName = params.staffName !== undefined ? params.staffName : existing.staffName;
  const targetRoomId = params.roomId !== undefined ? params.roomId : existing.roomId;
  const targetRoomName = params.roomName !== undefined ? params.roomName : existing.roomName;

  // 2. 스태프 근무시간 검증
  if (targetStaffId) {
    const isOutside = isOutsideStaffHours({
      staffId: targetStaffId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      windows: params.staffHours ?? ScheduleService.getStaffHours(),
    });
    if (isOutside) {
      return {
        ok: false,
        conflictType: 'staff_hours',
        message: `${targetStaffName || '담당자'}의 근무시간 외에는 예약할 수 없습니다.`,
      };
    }
  }

  // 3. 스태프 시간 중복 충돌 검증 (대기 waitlist는 제외)
  if (targetStaffId && !existing.waitlist) {
    const staffConflict = findStaffTimeConflict({
      staffId: targetStaffId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      bookings,
      ignoreId: existing.id,
    });
    if (staffConflict) {
      return {
        ok: false,
        conflictType: 'staff_conflict',
        message: `${targetStaffName || '담당자'}에게 해당 시간대에 이미 다른 예약이 있습니다.`,
      };
    }
  }

  // 4. 룸 자원 중복 충돌 검증
  if (targetRoomId) {
    const roomConflict = findTreatmentRoomConflict({
      roomId: targetRoomId,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      bookings,
      ignoreId: existing.id,
    });
    if (roomConflict) {
      return {
        ok: false,
        conflictType: 'room_conflict',
        message: `${targetRoomName || '선택한 공간'}은(는) 해당 시간에 이미 예약되어 있습니다.`,
      };
    }
  }

  // 5. 그룹 정원 마감 검증 (해당 슬롯이 다른 모집 그룹일 경우)
  if (existing.serviceId && targetStaffId) {
    const services = ScheduleService.getActiveServiceOfferings();
    const service = services.find((s) => s.id === existing.serviceId);
    if (service && service.maxCapacity && service.maxCapacity > 1) {
      const recruitments = ScheduleService.getSlotRecruitments();
      const capacityInfo = getSlotCapacityInfo({
        service,
        staffId: targetStaffId,
        startsAt: params.startsAt,
        bookings: bookings.filter((b) => b.id !== existing.id),
        recruitments,
      });
      if (capacityInfo.isClosed) {
        return {
          ok: false,
          conflictType: 'capacity_closed',
          message: '해당 시간대는 이미 정원이 마감되었습니다.',
        };
      }
    }
  }

  // 6. 업데이트 및 저장
  const updated: Booking = {
    ...existing,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    staffId: targetStaffId,
    staffName: targetStaffName,
    roomId: targetRoomId,
    roomName: targetRoomName,
  };

  const saved = ScheduleService.saveBooking(updated);

  // 7. 고객 알림 발송 (기본 true)
  if (params.notify !== false) {
    const student = StudentService.getStudentById(saved.customerId);
    notifyBookingChange({
      studentId: saved.customerId,
      studentName: saved.customerName,
      parentPhone: student?.phone,
      title: '예약 일정 변경',
      message: `${saved.serviceName || '예약'} 일정이 ${params.startsAt.slice(0, 16).replace('T', ' ')}로 변경되었습니다.`,
      date: params.startsAt.slice(0, 10),
    });
  }

  return { ok: true, booking: saved };
}
