import type { DayOfWeek, ClassItem } from '@/types';
import { weekdayFromDate } from './weekdayKo';

export function getKoreanDayOfWeek(date: Date = new Date()): DayOfWeek {
  return weekdayFromDate(date);
}

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type DerivedClassOccurrence = {
  date: string;
  dayLabel: DayOfWeek;
  classItem: ClassItem;
};

/** 등록 반 템플릿에서 해당일 수업 파생 (업종 공통) */
export function getTodayClasses(classes: ClassItem[], date: Date = new Date()): ClassItem[] {
  const today = getKoreanDayOfWeek(date);
  return classes
    .filter((c) => c.daysOfWeek.includes(today))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/** 오늘 포함 앞으로 7일 수업 발생 목록 */
export function getUpcomingWeekOccurrences(
  classes: ClassItem[],
  from: Date = new Date()
): DerivedClassOccurrence[] {
  const result: DerivedClassOccurrence[] = [];
  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(from);
    d.setDate(from.getDate() + offset);
    const dayLabel = getKoreanDayOfWeek(d);
    const dateKey = formatDateKey(d);
    for (const classItem of classes) {
      if (!classItem.daysOfWeek.includes(dayLabel)) continue;
      result.push({ date: dateKey, dayLabel, classItem });
    }
  }
  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.classItem.startTime.localeCompare(b.classItem.startTime)
  );
}
