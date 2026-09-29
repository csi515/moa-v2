import type { DayOfWeek } from '@/types';
import { formatIsoDateLocal } from '@/shared/utils/localDate';

const FROM_MONDAY: Record<Exclude<DayOfWeek, '일'>, number> = {
  월: 0,
  화: 1,
  수: 2,
  목: 3,
  금: 4,
  토: 5,
};

/** 이번 주에서 요일에 해당하는 YYYY-MM-DD (월~토 기준) */
export function isoDateForWeekdayThisWeek(day: DayOfWeek): string {
  const now = new Date();
  const jsDay = now.getDay();
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(12, 0, 0, 0);

  if (day === '일') {
    monday.setDate(monday.getDate() + 6);
    return formatIsoDateLocal(monday);
  }

  monday.setDate(monday.getDate() + FROM_MONDAY[day]);
  return formatIsoDateLocal(monday);
}
