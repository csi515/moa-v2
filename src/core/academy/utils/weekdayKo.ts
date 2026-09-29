import type { DayOfWeek } from '@/types';

/** JS getDay() 인덱스(0=일) → 한국어 요일 */
export const DAY_OF_WEEK_BY_JS_INDEX: readonly DayOfWeek[] = [
  '일',
  '월',
  '화',
  '수',
  '목',
  '금',
  '토',
] as const;

export function weekdayFromJsDay(jsDay: number): DayOfWeek {
  return DAY_OF_WEEK_BY_JS_INDEX[jsDay] ?? '월';
}

export function weekdayFromDate(date: Date = new Date()): DayOfWeek {
  return weekdayFromJsDay(date.getDay());
}

/** ISO 날짜(YYYY-MM-DD) → 요일. 정오 기준으로 타임존 오차 방지 */
export function weekdayFromIsoDate(isoDate: string): DayOfWeek {
  return weekdayFromDate(new Date(`${isoDate}T12:00:00`));
}
