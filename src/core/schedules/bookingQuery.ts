/**
 * 예약 목록 순수 조회 헬퍼 (in-memory cache / 향후 remote row 동일 형태).
 * Domain Service가 online DB / offline snapshot 결과를 이 API로 좁힌다.
 */
import type { Booking } from '@/core/types/schedule';

/** YYYY-MM-DD 접두로 startsAt 필터 (DB: starts_at >= date AND starts_at < date+1일 과 동치) */
export function filterBookingsByDate(bookings: readonly Booking[], date: string): Booking[] {
  if (!date) return [];
  const out: Booking[] = [];
  for (const booking of bookings) {
    if (booking.startsAt.startsWith(date)) out.push(booking);
  }
  return out;
}

/**
 * 다가오는 예약 top-N.
 * 전체 sort 대신 한 번 스캔 + 삽입(O(n·limit)) — dashboard limit 5~10에 유리.
 */
export function selectUpcomingBookings(
  bookings: readonly Booking[],
  options?: { nowIso?: string; limit?: number }
): Booking[] {
  const nowIso = options?.nowIso ?? new Date().toISOString();
  const limit = Math.max(0, options?.limit ?? 10);
  if (limit === 0) return [];

  const top: Booking[] = [];
  for (const booking of bookings) {
    if (booking.startsAt < nowIso || booking.status === 'cancelled') continue;

    if (top.length < limit) {
      top.push(booking);
      // 삽입 정렬로 startsAt 오름차순 유지
      for (let i = top.length - 1; i > 0; i--) {
        if (top[i].startsAt >= top[i - 1].startsAt) break;
        const tmp = top[i - 1];
        top[i - 1] = top[i];
        top[i] = tmp;
      }
      continue;
    }

    const last = top[limit - 1];
    if (booking.startsAt >= last.startsAt) continue;
    top[limit - 1] = booking;
    for (let i = limit - 1; i > 0; i--) {
      if (top[i].startsAt >= top[i - 1].startsAt) break;
      const tmp = top[i - 1];
      top[i - 1] = top[i];
      top[i] = tmp;
    }
  }
  return top;
}

/** 특정 시작 시각(+선택 service)만 — 정원 계산 전 스캔 범위 축소 */
export function filterBookingsForSlotWindow(
  bookings: readonly Booking[],
  startsAt: string,
  serviceId?: string
): Booking[] {
  const out: Booking[] = [];
  for (const booking of bookings) {
    if (booking.startsAt !== startsAt) continue;
    if (serviceId && booking.serviceId !== serviceId) continue;
    out.push(booking);
  }
  return out;
}
