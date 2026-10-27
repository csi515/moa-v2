import { startOfLocalDay, startOfNextLocalDay } from '@/shared/utils/localDate';

export const TODAY_RESERVATION_PAGE_SIZE = 100;
export const TODAY_RESERVATION_MAX = 500;

export function localDayReservationWindow(now: Date = new Date()): { from: Date; to: Date } {
  return {
    from: startOfLocalDay(now),
    to: startOfNextLocalDay(now),
  };
}

export function shouldFetchNextReservationPage(
  pageLength: number,
  offset: number,
  pageSize = TODAY_RESERVATION_PAGE_SIZE,
  max = TODAY_RESERVATION_MAX
): boolean {
  return pageLength >= pageSize && offset + pageLength < max;
}

export function isReservationOnLocalDay(startsAt: string, dateKey: string): boolean {
  const d = new Date(startsAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}` === dateKey;
}
