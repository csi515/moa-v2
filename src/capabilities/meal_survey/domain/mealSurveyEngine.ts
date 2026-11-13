/** 사내 식수인원 조사 순수 검증·집계·기간 유틸 */

export type MemberWithRole = {
  role?: string | null;
  permissions?: Record<string, boolean> | null;
};

export type MealSlot = 'breakfast' | 'lunch' | 'dinner';
export type MealResponseStatus = 'eating' | 'skipping';
export type MealCellStatus = MealResponseStatus | null;

export type MealSurveySettings = {
  offerBreakfast: boolean;
  offerLunch: boolean;
  offerDinner: boolean;
  /** 평일 기본 식사(표시·미응답 시 eating으로 간주하는 정책 플래그) */
  defaultEating: boolean;
  breakfastCutoffTime: string;
  breakfastCutoffPrevDay: boolean;
  lunchCutoffTime: string;
  lunchCutoffPrevDay: boolean;
  dinnerCutoffTime: string;
  dinnerCutoffPrevDay: boolean;
};

export const DEFAULT_MEAL_SURVEY_SETTINGS: MealSurveySettings = {
  offerBreakfast: false,
  offerLunch: true,
  offerDinner: false,
  defaultEating: true,
  breakfastCutoffTime: '17:00',
  breakfastCutoffPrevDay: true,
  lunchCutoffTime: '09:00',
  lunchCutoffPrevDay: false,
  dinnerCutoffTime: '15:00',
  dinnerCutoffPrevDay: false,
};

export type MealDayAggregate = {
  mealDate: string;
  mealSlot: MealSlot;
  eatingCount: number;
  skippingCount: number;
  unsetCount: number;
};

export function canManageMealSurveyActivity(member: MemberWithRole): boolean {
  if (member.role === 'owner' || member.role === 'admin') return true;
  const perms = member.permissions ?? {};
  return perms['meal_survey:manage'] === true;
}

export function validateMealSurveySettings(
  settings: MealSurveySettings
): { isValid: boolean; error?: string } {
  if (!settings.offerBreakfast && !settings.offerLunch && !settings.offerDinner) {
    return { isValid: false, error: '조식·중식·석식 중 최소 하나는 제공해야 합니다.' };
  }
  return { isValid: true };
}

export function activeMealSlots(settings: MealSurveySettings): MealSlot[] {
  const slots: MealSlot[] = [];
  if (settings.offerBreakfast) slots.push('breakfast');
  if (settings.offerLunch) slots.push('lunch');
  if (settings.offerDinner) slots.push('dinner');
  return slots;
}

export function isMealSlotOffered(settings: MealSurveySettings, slot: MealSlot): boolean {
  if (slot === 'breakfast') return settings.offerBreakfast;
  if (slot === 'lunch') return settings.offerLunch;
  return settings.offerDinner;
}

export function cycleMealCellStatus(current: MealCellStatus): MealCellStatus {
  if (current === null) return 'eating';
  if (current === 'eating') return 'skipping';
  return null;
}

export function mealSlotLabel(slot: MealSlot): string {
  if (slot === 'breakfast') return '조식';
  if (slot === 'lunch') return '중식';
  return '석식';
}

export function mealStatusLabel(status: MealCellStatus): string {
  if (status === 'eating') return '식사';
  if (status === 'skipping') return '미식사';
  return '미응답';
}

/** YYYY-MM-DD */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function listDatesInRange(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  const cur = parseDateKey(fromKey);
  const end = parseDateKey(toKey);
  while (cur <= end) {
    out.push(toDateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function monthRange(anchor: Date): { from: string; to: string } {
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function weekRange(anchor: Date): { from: string; to: string } {
  const from = startOfWeekMonday(anchor);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from: toDateKey(from), to: toDateKey(to) };
}

export function dayRange(anchor: Date): { from: string; to: string } {
  const key = toDateKey(anchor);
  return { from: key, to: key };
}

export function aggregateDaySlots(
  memberCount: number,
  responses: Array<{ mealDate: string; mealSlot: MealSlot; status: MealResponseStatus }>,
  slots: MealSlot[],
  dates: string[]
): MealDayAggregate[] {
  const map = new Map<string, { eating: number; skipping: number }>();
  for (const r of responses) {
    const key = `${r.mealDate}|${r.mealSlot}`;
    const cur = map.get(key) ?? { eating: 0, skipping: 0 };
    if (r.status === 'eating') cur.eating += 1;
    else cur.skipping += 1;
    map.set(key, cur);
  }
  const out: MealDayAggregate[] = [];
  for (const mealDate of dates) {
    for (const mealSlot of slots) {
      const cur = map.get(`${mealDate}|${mealSlot}`) ?? { eating: 0, skipping: 0 };
      out.push({
        mealDate,
        mealSlot,
        eatingCount: cur.eating,
        skippingCount: cur.skipping,
        unsetCount: Math.max(0, memberCount - cur.eating - cur.skipping),
      });
    }
  }
  return out;
}

export function responseMapKey(mealDate: string, mealSlot: MealSlot): string {
  return `${mealDate}|${mealSlot}`;
}

function parseTimeHm(value: string): { h: number; m: number } {
  const [h, m] = value.split(':').map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

/** mealDate(YYYY-MM-DD) + 컷오프 시각·전일여부 → Date */
export function mealCutoffAt(
  mealDate: string,
  cutoffTime: string,
  prevDay: boolean
): Date {
  const [y, mo, d] = mealDate.split('-').map(Number);
  const base = new Date(y, (mo ?? 1) - 1, d ?? 1);
  if (prevDay) base.setDate(base.getDate() - 1);
  const { h, m } = parseTimeHm(cutoffTime);
  base.setHours(h, m, 0, 0);
  return base;
}

export function isMealSlotWritable(
  settings: MealSurveySettings,
  mealDate: string,
  mealSlot: MealSlot,
  now: Date = new Date(Date.now())
): boolean {
  if (!isMealSlotOffered(settings, mealSlot)) return false;
  let cutoffTime = settings.lunchCutoffTime;
  let prevDay = settings.lunchCutoffPrevDay;
  if (mealSlot === 'breakfast') {
    cutoffTime = settings.breakfastCutoffTime;
    prevDay = settings.breakfastCutoffPrevDay;
  } else if (mealSlot === 'dinner') {
    cutoffTime = settings.dinnerCutoffTime;
    prevDay = settings.dinnerCutoffPrevDay;
  }
  return now.getTime() < mealCutoffAt(mealDate, cutoffTime, prevDay).getTime();
}
