import { computeCapacitySnapshot } from './capacityMath';
import type { Booking, BookingStatus, ServiceOffering, SlotRecruitment } from '@/core/types/schedule';

const ACTIVE_STATUSES: BookingStatus[] = ['scheduled', 'confirmed', 'completed', 'no_show'];

/** 미지정 강사 슬롯 키 토큰 */
export const UNASSIGNED_STAFF_TOKEN = '_unassigned_';

export function normalizeStaffId(staffId?: string | null): string {
  return staffId?.trim() ? staffId.trim() : UNASSIGNED_STAFF_TOKEN;
}

/**
 * 같은 수업 + 같은 강사 + 같은 시작 시각 = 하나의 모집 슬롯.
 * 강사가 다르면 같은 시간이라도 서로 독립적으로 예약·정원 관리.
 */
export function buildSlotKey(serviceId: string, staffId: string | null | undefined, startsAt: string): string {
  return `${serviceId}|${normalizeStaffId(staffId)}|${startsAt}`;
}

export function isActiveBookingStatus(status: BookingStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

/**
 * 활성(정원 점유) 예약의 슬롯별 건수 — 리스트 렌더 시 O(슬롯)×O(전체) 반복 방지.
 */
export function buildSlotOccupancyIndex(bookings: readonly Booking[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const booking of bookings) {
    if (!booking.serviceId || booking.waitlist) continue;
    if (!isActiveBookingStatus(booking.status)) continue;
    const key = buildSlotKey(booking.serviceId, booking.staffId, booking.startsAt);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

export interface SlotBookingGroup {
  key: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  serviceName: string;
  staffName: string;
  endsAt: string;
  bookings: Booking[];
}

/** 같은 수업·강사·시작시각 예약을 한 수업으로 묶는다. 강사·수업이 없으면 예약 단위로 둔다. */
export function groupBookingsIntoSlots(bookings: Booking[]): SlotBookingGroup[] {
  const groups = new Map<string, SlotBookingGroup>();
  for (const booking of bookings) {
    const key =
      booking.serviceId && booking.staffId
        ? buildSlotKey(booking.serviceId, booking.staffId, booking.startsAt)
        : `booking|${booking.id}`;
    const existing = groups.get(key);
    if (existing) {
      existing.bookings.push(booking);
      continue;
    }
    groups.set(key, {
      key,
      serviceId: booking.serviceId || '',
      staffId: booking.staffId || '',
      startsAt: booking.startsAt,
      serviceName: booking.serviceName || '',
      staffName: booking.staffName || '',
      endsAt: booking.endsAt,
      bookings: [booking],
    });
  }
  return [...groups.values()];
}

/** 취소된 예약은 자리를 비운 것으로 보고, 같은 회원의 활성 예약만 찾는다. */
export function findActiveMemberInSlot(
  bookings: Booking[],
  customerId: string,
  serviceId: string,
  staffId: string | null | undefined,
  startsAt: string
): Booking | undefined {
  const staffToken = normalizeStaffId(staffId);
  return bookings.find(
    (booking) =>
      booking.customerId === customerId &&
      booking.serviceId === serviceId &&
      booking.startsAt === startsAt &&
      normalizeStaffId(booking.staffId) === staffToken &&
      booking.status !== 'cancelled' &&
      !booking.waitlist
  );
}

export function countSlotOccupancy(
  bookings: Booking[],
  serviceId: string,
  staffId: string | null | undefined,
  startsAt: string
): number {
  const staffToken = normalizeStaffId(staffId);
  return bookings.filter((b) => {
    if (b.serviceId !== serviceId || b.startsAt !== startsAt) return false;
    if (b.waitlist) return false;
    if (!isActiveBookingStatus(b.status)) return false;
    return normalizeStaffId(b.staffId) === staffToken;
  }).length;
}

export interface SlotCapacityInfo {
  slotKey: string;
  serviceId: string;
  staffId: string;
  startsAt: string;
  occupied: number;
  maxCapacity: number;
  remaining: number;
  closedManually: boolean;
  /** 수동 마감 또는 정원 도달 */
  isClosed: boolean;
}

export function getSlotCapacityInfo(params: {
  service: ServiceOffering;
  staffId?: string | null;
  startsAt: string;
  bookings: Booking[];
  recruitments?: SlotRecruitment[];
  /** buildSlotOccupancyIndex 결과 — 있으면 bookings 전체 재스캔 생략 */
  occupancyIndex?: Map<string, number>;
}): SlotCapacityInfo {
  const { service, staffId, startsAt, bookings, recruitments = [], occupancyIndex } = params;
  const normalizedStaffId = normalizeStaffId(staffId);
  const slotKey = buildSlotKey(service.id, normalizedStaffId, startsAt);
  const occupied =
    occupancyIndex?.get(slotKey) ??
    countSlotOccupancy(bookings, service.id, normalizedStaffId, startsAt);
  const recruitment = recruitments.find((r) => {
    const key =
      r.id.includes('|') && r.id.split('|').length >= 3
        ? r.id
        : buildSlotKey(r.serviceId, r.staffId ?? UNASSIGNED_STAFF_TOKEN, r.startsAt);
    return key === slotKey;
  });
  const snapshot = computeCapacitySnapshot({
    capacity: recruitment?.maxCapacity || service.maxCapacity || 1,
    booked: occupied,
  });
  const closedManually = recruitment?.closedManually === true;

  return {
    slotKey,
    serviceId: service.id,
    staffId: normalizedStaffId,
    startsAt,
    occupied: snapshot.booked,
    maxCapacity: snapshot.capacity,
    remaining: snapshot.available,
    closedManually,
    isClosed: closedManually || snapshot.isFull,
  };
}
