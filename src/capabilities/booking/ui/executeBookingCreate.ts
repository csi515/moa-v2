/**
 * 예약 생성 오케스트레이션: 검증 → (정원 반영) → 마감 재검사 → 저장.
 * toast/모달 닫기는 호출측.
 */
import type { Booking, ServiceOffering, SlotRecruitment } from '@/core/types/schedule';
import type { StaffWorkWindow } from '@/types';
import {
  validateBookingCreate,
  validateSlotNotClosed,
  type BookingCreatePayload,
  type BookingFormLabels,
  type BookingFormSnapshot,
  type BookingParty,
  type BookingRoom,
} from './validateBookingCreate';

export type CreateBookingDeps = {
  skin: boolean;
  form: BookingFormSnapshot;
  members: BookingParty[];
  services: ServiceOffering[];
  instructors: BookingParty[];
  treatmentRooms: BookingRoom[];
  labels: BookingFormLabels;
  getBookings: () => Booking[];
  getRecruitments: () => SlotRecruitment[];
  getStaffHours: () => StaffWorkWindow[] | undefined;
  remainingSessions: (customerId: string) => number;
  /** occupied 미만이면 false. toast는 구현체가 담당해도 됨 */
  applySlotCapacity: (
    serviceId: string,
    staffId: string,
    startsAt: string,
    nextCapacity: number
  ) => boolean;
  saveBooking: (payload: BookingCreatePayload) => void;
};

export type CreateBookingResult =
  | { ok: true; staffName: string }
  | { ok: false; message: string };

export function executeBookingCreate(deps: CreateBookingDeps): CreateBookingResult {
  const bookings = deps.getBookings();
  const recruitments = deps.getRecruitments();

  const validated = validateBookingCreate({
    skin: deps.skin,
    form: deps.form,
    members: deps.members,
    services: deps.services,
    instructors: deps.instructors,
    treatmentRooms: deps.treatmentRooms,
    bookings,
    recruitments,
    staffHours: deps.getStaffHours(),
    remainingSessions: deps.remainingSessions,
    labels: deps.labels,
  });

  if (validated.ok === false) {
    return { ok: false, message: validated.message };
  }

  if (validated.pendingSlotCapacity != null) {
    const applied = deps.applySlotCapacity(
      validated.payload.serviceId,
      validated.payload.staffId,
      validated.payload.startsAt,
      validated.pendingSlotCapacity
    );
    if (!applied) {
      // applySlotCapacity 구현체가 이미 toast한 경우 메시지 생략
      return { ok: false, message: '' };
    }
  }

  const service = deps.services.find((s) => s.id === validated.payload.serviceId);
  if (!service) {
    return { ok: false, message: `${deps.labels.service}을 선택해 주세요.` };
  }

  const afterBookings = deps.getBookings();
  const afterRecruitments = deps.getRecruitments();
  const slot = validateSlotNotClosed({
    service,
    staffId: validated.payload.staffId,
    staffName: validated.payload.staffName,
    startsAt: validated.payload.startsAt,
    bookings: afterBookings,
    recruitments: afterRecruitments,
    staffLabel: deps.labels.staff,
  });
  if (slot.ok === false) {
    return { ok: false, message: slot.message };
  }

  deps.saveBooking({
    ...validated.payload,
  });

  return { ok: true, staffName: validated.payload.staffName };
}
