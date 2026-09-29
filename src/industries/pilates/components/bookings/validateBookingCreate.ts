/**
 * 예약 생성 검증·정책 (순수).
 * UI toast / ScheduleService 부작용은 호출측에서 처리.
 */
import type { Booking, ServiceOffering, SlotRecruitment } from '@/core/types/schedule';
import { findActiveMemberInSlot, getSlotCapacityInfo } from '@/capabilities/scheduling/capacity';
import { isOutsideStaffHours } from '@/capabilities/scheduling/availability/windows';
import {
  findInstructorClassOverlap,
  findStaffTimeConflict,
  findTreatmentRoomConflict,
} from '@/industries/skin/bookingRooms';
import type { StaffWorkWindow } from '@/types';

export type BookingFormLabels = {
  customer: string;
  staff: string;
  service: string;
};

export type BookingFormSnapshot = {
  memberId: string;
  serviceId: string;
  staffId: string;
  date: string;
  time: string;
  roomId: string;
  slotCapacity: string;
  skinCondition: string;
  chartNote: string;
};

export type BookingParty = {
  id: string;
  name: string;
};

export type BookingRoom = {
  id: string;
  name: string;
};

export type ValidateBookingCreateContext = {
  skin: boolean;
  form: BookingFormSnapshot;
  members: BookingParty[];
  services: ServiceOffering[];
  instructors: BookingParty[];
  treatmentRooms: BookingRoom[];
  bookings: Booking[];
  recruitments: SlotRecruitment[];
  staffHours?: StaffWorkWindow[];
  remainingSessions: (customerId: string) => number;
  labels: BookingFormLabels;
};

export type BookingCreatePayload = {
  customerId: string;
  customerName: string;
  staffId: string;
  staffName: string;
  serviceId: string;
  serviceName: string;
  startsAt: string;
  endsAt: string;
  roomId?: string;
  roomName?: string;
  skinCondition?: string;
  chartNote?: string;
};

export type ValidateBookingCreateResult =
  | { ok: false; message: string }
  | {
      ok: true;
      payload: BookingCreatePayload;
      /** 필라테스: 저장 전 정원 갱신이 필요하면 값 제시 */
      pendingSlotCapacity: number | null;
      currentMaxCapacity: number;
    };

function buildEndsAt(startsAt: string, durationMinutes: number): string {
  const start = new Date(startsAt);
  return new Date(start.getTime() + durationMinutes * 60 * 1000).toISOString();
}

/** 필라테스: 이용권·중복 등록·강사 수업 겹침 */
export function validatePilatesCreateRules(params: {
  member: BookingParty;
  service: ServiceOffering;
  instructor: BookingParty;
  startsAt: string;
  endsAt: string;
  bookings: Booking[];
  remainingSessions: number;
  staffLabel: string;
}): { ok: true } | { ok: false; message: string } {
  if (params.remainingSessions <= 0) {
    return { ok: false, message: '이용권 잔여가 없습니다. 이용권을 먼저 등록해 주세요.' };
  }
  if (
    findActiveMemberInSlot(
      params.bookings,
      params.member.id,
      params.service.id,
      params.instructor.id,
      params.startsAt
    )
  ) {
    return {
      ok: false,
      message: `${params.member.name}은 이 수업에 이미 등록되어 있습니다.`,
    };
  }
  const overlap = findInstructorClassOverlap({
    staffId: params.instructor.id,
    serviceId: params.service.id,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    bookings: params.bookings,
  });
  if (overlap) {
    return {
      ok: false,
      message: `${params.instructor.name} ${params.staffLabel}는 이 시간에 다른 수업이 있습니다.`,
    };
  }
  return { ok: true };
}

/** 피부과: 근무시간·스태프 충돌·룸 충돌 */
export function validateSkinCreateRules(params: {
  instructor: BookingParty;
  startsAt: string;
  endsAt: string;
  bookings: Booking[];
  staffHours?: StaffWorkWindow[];
  selectedRoom: BookingRoom | undefined;
  staffLabel: string;
}): { ok: true } | { ok: false; message: string } {
  if (
    isOutsideStaffHours({
      staffId: params.instructor.id,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      windows: params.staffHours,
    })
  ) {
    return { ok: false, message: `${params.instructor.name} 근무시간이 아닙니다.` };
  }
  const staffConflict = findStaffTimeConflict({
    staffId: params.instructor.id,
    startsAt: params.startsAt,
    endsAt: params.endsAt,
    bookings: params.bookings,
  });
  if (staffConflict) {
    return {
      ok: false,
      message: `${params.instructor.name} ${params.staffLabel}는 이 시간에 이미 예약이 있습니다.`,
    };
  }
  if (params.selectedRoom) {
    const conflict = findTreatmentRoomConflict({
      roomId: params.selectedRoom.id,
      startsAt: params.startsAt,
      endsAt: params.endsAt,
      bookings: params.bookings,
    });
    if (conflict) {
      return {
        ok: false,
        message: `${params.selectedRoom.name}은 이 시간에 이미 예약되어 있습니다.`,
      };
    }
  }
  return { ok: true };
}

export function validateSlotNotClosed(params: {
  service: ServiceOffering;
  staffId: string;
  staffName: string;
  startsAt: string;
  bookings: Booking[];
  recruitments: SlotRecruitment[];
  staffLabel: string;
}): { ok: true } | { ok: false; message: string } {
  const capacity = getSlotCapacityInfo({
    service: params.service,
    staffId: params.staffId,
    startsAt: params.startsAt,
    bookings: params.bookings,
    recruitments: params.recruitments,
  });
  if (capacity.isClosed) {
    return {
      ok: false,
      message: capacity.closedManually
        ? `${params.staffName} ${params.staffLabel} 이 시간대는 모집이 마감되었습니다.`
        : `${params.staffName} ${params.staffLabel} 정원이 가득 찼습니다 (${capacity.occupied}/${capacity.maxCapacity}).`,
    };
  }
  return { ok: true };
}

/**
 * 예약 생성 전 검증.
 * pendingSlotCapacity: 필라테스에서 정원 입력이 현재 max와 다르면 호출측이 먼저 반영 후
 * validateSlotNotClosed를 다시 호출하거나, create 오케스트레이션에서 처리한다.
 */
export function validateBookingCreate(
  ctx: ValidateBookingCreateContext
): ValidateBookingCreateResult {
  const { form, labels, skin } = ctx;
  const member = ctx.members.find((m) => m.id === form.memberId);
  const service = ctx.services.find((s) => s.id === form.serviceId);
  const instructor = ctx.instructors.find((i) => i.id === form.staffId);

  if (!member || !service) {
    return {
      ok: false,
      message: `${labels.customer}과 ${labels.service}을 선택해 주세요.`,
    };
  }
  if (!instructor) {
    return {
      ok: false,
      message: `${labels.staff}를 선택해 주세요. ${labels.staff}별로 예약·정원이 관리됩니다.`,
    };
  }

  const startsAt = `${form.date}T${form.time}:00`;
  const endsAt = buildEndsAt(startsAt, service.durationMinutes);
  const selectedRoom = ctx.treatmentRooms.find((room) => room.id === form.roomId);

  const capacityInfo = getSlotCapacityInfo({
    service,
    staffId: instructor.id,
    startsAt,
    bookings: ctx.bookings,
    recruitments: ctx.recruitments,
  });
  const currentMaxCapacity = capacityInfo.maxCapacity || service.maxCapacity || 1;
  const nextCapacity = Number(form.slotCapacity);
  const pendingSlotCapacity =
    !skin && nextCapacity && nextCapacity !== currentMaxCapacity ? nextCapacity : null;

  if (!skin) {
    const pilates = validatePilatesCreateRules({
      member,
      service,
      instructor,
      startsAt,
      endsAt,
      bookings: ctx.bookings,
      remainingSessions: ctx.remainingSessions(member.id),
      staffLabel: labels.staff,
    });
    if (pilates.ok === false) {
      return { ok: false, message: pilates.message };
    }
  }

  // 정원 갱신 예정이면 마감 검사는 갱신 후 오케스트레이션에서 재실행
  if (pendingSlotCapacity == null) {
    const slot = validateSlotNotClosed({
      service,
      staffId: instructor.id,
      staffName: instructor.name,
      startsAt,
      bookings: ctx.bookings,
      recruitments: ctx.recruitments,
      staffLabel: labels.staff,
    });
    if (slot.ok === false) {
      return { ok: false, message: slot.message };
    }
  }

  if (skin) {
    const skinRules = validateSkinCreateRules({
      instructor,
      startsAt,
      endsAt,
      bookings: ctx.bookings,
      staffHours: ctx.staffHours,
      selectedRoom,
      staffLabel: labels.staff,
    });
    if (skinRules.ok === false) {
      return { ok: false, message: skinRules.message };
    }
  }

  return {
    ok: true,
    pendingSlotCapacity,
    currentMaxCapacity,
    payload: {
      customerId: member.id,
      customerName: member.name,
      staffId: instructor.id,
      staffName: instructor.name,
      serviceId: service.id,
      serviceName: service.name,
      startsAt,
      endsAt,
      roomId: selectedRoom?.id,
      roomName: selectedRoom?.name,
      skinCondition: form.skinCondition.trim() || undefined,
      chartNote: form.chartNote.trim() || undefined,
    },
  };
}
