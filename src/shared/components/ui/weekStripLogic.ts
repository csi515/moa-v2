const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'] as const;

export type WeekStripDay = {
  date: Date;
  dateKey: string;
  dayOfMonth: number;
  weekdayLabel: string;
  isSunday: boolean;
  isSaturday: boolean;
};

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 선택일이 속한 주의 일요일~토요일 7일을 반환한다.
 */
export function buildWeekStripDays(selectedDate: Date): WeekStripDay[] {
  const base = startOfLocalDay(selectedDate);
  const sunday = new Date(base);
  sunday.setDate(base.getDate() - base.getDay());

  const days: WeekStripDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    days.push({
      date,
      dateKey: toDateKey(date),
      dayOfMonth: date.getDate(),
      weekdayLabel: WEEKDAY_NAMES[i],
      isSunday: i === 0,
      isSaturday: i === 6,
    });
  }
  return days;
}

export function shiftWeek(selectedDate: Date, weekDelta: number): Date {
  const next = startOfLocalDay(selectedDate);
  next.setDate(next.getDate() + weekDelta * 7);
  return next;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}
