import type { PublicHolidayItem } from './types';

/** 고정 공휴일 (양력) */
const FIXED_HOLIDAYS: Array<{ month: number; day: number; name: string }> = [
  { month: 1, day: 1, name: '신정' },
  { month: 3, day: 1, name: '삼일절' },
  { month: 5, day: 5, name: '어린이날' },
  { month: 6, day: 6, name: '현충일' },
  { month: 8, day: 15, name: '광복절' },
  { month: 10, day: 3, name: '개천절' },
  { month: 10, day: 9, name: '한글날' },
  { month: 12, day: 25, name: '크리스마스' },
];

/**
 * 설·추석·부처님오신날 등 연도별 특일 (API 실패 시 보조).
 * 대체공휴일 포함 — 공공 API가 우선이며, 여기는 최소 보장용.
 */
const VARIABLE_BY_YEAR: Record<number, PublicHolidayItem[]> = {
  2025: [
    { date: '2025-01-27', name: '설날 연휴' },
    { date: '2025-01-28', name: '설날' },
    { date: '2025-01-29', name: '설날 연휴' },
    { date: '2025-01-30', name: '설날 대체공휴일' },
    { date: '2025-03-03', name: '삼일절 대체공휴일' },
    { date: '2025-05-05', name: '어린이날·부처님오신날' },
    { date: '2025-05-06', name: '어린이날 대체공휴일' },
    { date: '2025-10-05', name: '추석 연휴' },
    { date: '2025-10-06', name: '추석' },
    { date: '2025-10-07', name: '추석 연휴' },
    { date: '2025-10-08', name: '추석 대체공휴일' },
  ],
  2026: [
    { date: '2026-02-16', name: '설날 연휴' },
    { date: '2026-02-17', name: '설날' },
    { date: '2026-02-18', name: '설날 연휴' },
    { date: '2026-05-24', name: '부처님오신날' },
    { date: '2026-05-25', name: '부처님오신날 대체공휴일' },
    { date: '2026-09-24', name: '추석 연휴' },
    { date: '2026-09-25', name: '추석' },
    { date: '2026-09-26', name: '추석 연휴' },
    { date: '2026-10-05', name: '개천절 대체공휴일' },
  ],
  2027: [
    { date: '2027-02-06', name: '설날 연휴' },
    { date: '2027-02-07', name: '설날' },
    { date: '2027-02-08', name: '설날 연휴' },
    { date: '2027-02-09', name: '설날 대체공휴일' },
    { date: '2027-05-13', name: '부처님오신날' },
    { date: '2027-08-16', name: '광복절 대체공휴일' },
    { date: '2027-09-14', name: '추석 연휴' },
    { date: '2027-09-15', name: '추석' },
    { date: '2027-09-16', name: '추석 연휴' },
    { date: '2027-10-04', name: '개천절 대체공휴일' },
    { date: '2027-10-11', name: '한글날 대체공휴일' },
  ],
  2028: [
    { date: '2028-01-26', name: '설날 연휴' },
    { date: '2028-01-27', name: '설날' },
    { date: '2028-01-28', name: '설날 연휴' },
    { date: '2028-05-02', name: '부처님오신날' },
    { date: '2028-10-02', name: '추석 연휴' },
    { date: '2028-10-03', name: '개천절·추석' },
    { date: '2028-10-04', name: '추석 연휴' },
    { date: '2028-10-05', name: '추석 대체공휴일' },
    { date: '2028-10-09', name: '한글날' },
  ],
};

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** API 없이 쓸 수 있는 연도별 공휴일 (고정 + 알려진 특일) */
export function getFallbackPublicHolidays(year: number): PublicHolidayItem[] {
  const byDate = new Map<string, string>();

  for (const h of FIXED_HOLIDAYS) {
    byDate.set(toDateKey(year, h.month, h.day), h.name);
  }
  for (const h of VARIABLE_BY_YEAR[year] ?? []) {
    byDate.set(h.date, h.name);
  }

  return Array.from(byDate.entries())
    .map(([date, name]) => ({ date, name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
