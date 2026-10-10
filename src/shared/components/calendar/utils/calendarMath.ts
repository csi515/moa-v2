import type { DayOfWeek } from '@/types';

export const DAYS_OF_WEEK: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];

export const JS_DAY_TO_DAY_OF_WEEK: Record<number, DayOfWeek> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

export function toMinutes(hhmm: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function toHhmm(minutes: number): string {
  const bounded = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const h = Math.floor(bounded / 60);
  const m = bounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function generateTimeSlots(
  startHour = 9,
  endHour = 22,
  intervalMinutes = 30
): string[] {
  const slots: string[] = [];
  const startMin = startHour * 60;
  const endMin = endHour * 60;

  for (let m = startMin; m < endMin; m += intervalMinutes) {
    slots.push(toHhmm(m));
  }
  return slots;
}

export interface WeekDayInfo {
  date: string; // 'YYYY-MM-DD'
  dayOfWeek: DayOfWeek;
  dayNumber: number;
  isToday: boolean;
}

/** 주어진 일자가 포함된 주의 월요일~일요일 7일 정보 반환 */
export function getWeekDaysForDate(refDate: Date): WeekDayInfo[] {
  const todayStr = formatDateIso(new Date());
  const date = new Date(refDate);
  const dayIndex = date.getDay(); // 0: 일, 1: 월, ... 6: 토
  // 월요일(1)을 0으로 맞춤: 월(0), 화(1), ... 토(5), 일(6)
  const mondayOffset = (dayIndex + 6) % 7;
  const monday = new Date(date);
  monday.setDate(date.getDate() - mondayOffset);

  const result: WeekDayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateStr = formatDateIso(current);
    const dow = JS_DAY_TO_DAY_OF_WEEK[current.getDay()];

    result.push({
      date: dateStr,
      dayOfWeek: dow,
      dayNumber: current.getDate(),
      isToday: dateStr === todayStr,
    });
  }

  return result;
}

export interface MonthDayInfo {
  date: string; // 'YYYY-MM-DD'
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayOfWeek: DayOfWeek;
  isWeekend: boolean;
}

/** 월간 달력 그리드용 일자 목록 생성 (전월 잔여일 + 당월 + 익월 잔여일, 일~토 7열) */
export function getMonthGridDays(year: number, month: number): MonthDayInfo[] {
  const todayStr = formatDateIso(new Date());
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);

  const startDayOfWeek = firstDay.getDay(); // 0: 일요일, ..., 6: 토요일
  const daysInMonth = lastDay.getDate();

  const days: MonthDayInfo[] = [];

  // 1. 이전 달 잔여 일자 채우기
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    const prevDate = new Date(year, month - 2, dayNum);
    const dateStr = formatDateIso(prevDate);
    const dow = JS_DAY_TO_DAY_OF_WEEK[prevDate.getDay()];
    days.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: dow,
      isWeekend: dow === '일' || dow === '토',
    });
  }

  // 2. 현재 달 일자
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month - 1, d);
    const dateStr = formatDateIso(curDate);
    const dow = JS_DAY_TO_DAY_OF_WEEK[curDate.getDay()];
    days.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
      dayOfWeek: dow,
      isWeekend: dow === '일' || dow === '토',
    });
  }

  // 3. 다음 달 채우기 (전체 셀이 7의 배수가 되도록)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const nextDate = new Date(year, month, d);
    const dateStr = formatDateIso(nextDate);
    const dow = JS_DAY_TO_DAY_OF_WEEK[nextDate.getDay()];
    days.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
      dayOfWeek: dow,
      isWeekend: dow === '일' || dow === '토',
    });
  }

  return days;
}
