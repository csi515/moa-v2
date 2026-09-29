export type PracticeRoomCalendarMode = 'day' | 'week' | 'month';

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'] as const;

export function todayIsoDate(): string {
  // 연습실 예약은 Asia/Seoul 고정(서버 starts_at 오프셋과 맞춤). 일반 UI 날짜는 localDate.todayIsoLocal 사용.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return formatIsoDate(d);
}

/** 해당 주 일요일 */
export function startOfWeekSunday(iso: string): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() - d.getDay());
  return formatIsoDate(d);
}

export function endOfWeekSaturday(iso: string): string {
  return addDaysIso(startOfWeekSunday(iso), 6);
}

export function startOfMonthIso(iso: string): string {
  const d = parseIsoDate(iso);
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonthIso(iso: string): string {
  const d = parseIsoDate(iso);
  return formatIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function shiftCalendarPeriod(
  mode: PracticeRoomCalendarMode,
  iso: string,
  delta: number
): string {
  const d = parseIsoDate(iso);
  if (mode === 'day') {
    d.setDate(d.getDate() + delta);
  } else if (mode === 'week') {
    d.setDate(d.getDate() + delta * 7);
  } else {
    d.setMonth(d.getMonth() + delta);
  }
  return formatIsoDate(d);
}

export function calendarPeriodLabel(mode: PracticeRoomCalendarMode, iso: string): string {
  const d = parseIsoDate(iso);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (mode === 'day') {
    return `${y}년 ${m}월 ${d.getDate()}일 (${WEEKDAY_KO[d.getDay()]})`;
  }
  if (mode === 'week') {
    const start = startOfWeekSunday(iso);
    const end = endOfWeekSaturday(iso);
    const s = parseIsoDate(start);
    const e = parseIsoDate(end);
    return `${s.getMonth() + 1}/${s.getDate()} – ${e.getMonth() + 1}/${e.getDate()}`;
  }
  return `${y}년 ${m}월`;
}

export function rangeForMode(
  mode: PracticeRoomCalendarMode,
  iso: string
): { start: string; end: string } {
  if (mode === 'day') return { start: iso, end: iso };
  if (mode === 'week') {
    return { start: startOfWeekSunday(iso), end: endOfWeekSaturday(iso) };
  }
  return { start: startOfMonthIso(iso), end: endOfMonthIso(iso) };
}

export function weekDates(iso: string): string[] {
  const start = startOfWeekSunday(iso);
  return Array.from({ length: 7 }, (_, i) => addDaysIso(start, i));
}

export function monthGridDates(iso: string): Array<string | null> {
  const first = parseIsoDate(startOfMonthIso(iso));
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = first.getDay();
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(formatIsoDate(new Date(first.getFullYear(), first.getMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function weekdayLabel(iso: string): string {
  return WEEKDAY_KO[parseIsoDate(iso).getDay()];
}

export function dayNumber(iso: string): number {
  return parseIsoDate(iso).getDate();
}

export { WEEKDAY_KO };
