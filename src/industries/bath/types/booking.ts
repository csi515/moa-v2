import type { ResourceReservationStatus } from '@/core/resources/types';

export const BATH_BOOKING_KINDS = ['room', 'scrub', 'massage', 'other'] as const;
export type BathBookingKind = (typeof BATH_BOOKING_KINDS)[number];

export const BATH_BOOKING_KIND_LABELS: Record<BathBookingKind, string> = {
  room: '객실',
  scrub: '세신',
  massage: '마사지',
  other: '기타',
};

/** 직원 겹침도 동일 Resource Reservation 원장으로 검증한다. */
export const STAFF_RESOURCE_KIND = 'staff';

export type BathBookingStatus = ResourceReservationStatus;

export type BathBooking = {
  id: string;
  organizationId: string;
  customerId: string;
  reservationId: string;
  staffReservationId?: string;
  serviceId?: string;
  resourceId: string;
  staffId?: string;
  roomId?: string;
  kind: BathBookingKind;
  startsAt: string;
  endsAt: string;
  status: BathBookingStatus;
  memo?: string;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type BathBookingCreateInput = {
  customerId: string;
  startsAt: string;
  endsAt?: string;
  resourceId?: string;
  roomId?: string;
  serviceId?: string;
  staffId?: string;
  memo?: string;
  idempotencyKey?: string;
};

export type BathBookingListQuery = {
  customerId?: string;
  resourceId?: string;
  serviceId?: string;
  status?: BathBookingStatus;
  fromIso?: string;
  toIso?: string;
};

export type BathAvailabilityQuery = {
  resourceId: string;
  startsAt: string;
  endsAt: string;
  staffId?: string;
};
