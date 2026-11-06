/** 온보딩용 요일 운영시간 초안 → 공개 페이지 business_hours 문구 */

export type OperatingDayKey = '월' | '화' | '수' | '목' | '금' | '토' | '일';

export interface OperatingDayDraft {
  day: OperatingDayKey;
  enabled: boolean;
  start: string;
  end: string;
}

export const DEFAULT_OPERATING_DAYS: OperatingDayDraft[] = [
  { day: '월', enabled: true, start: '14:00', end: '21:00' },
  { day: '화', enabled: true, start: '14:00', end: '21:00' },
  { day: '수', enabled: true, start: '14:00', end: '21:00' },
  { day: '목', enabled: true, start: '14:00', end: '21:00' },
  { day: '금', enabled: true, start: '14:00', end: '21:00' },
  { day: '토', enabled: true, start: '10:00', end: '18:00' },
  { day: '일', enabled: false, start: '10:00', end: '18:00' },
];

export const LESSON_DURATION_PRESETS = [30, 40, 50, 60] as const;
export type LessonDurationPreset = (typeof LESSON_DURATION_PRESETS)[number];

export const ONBOARDING_STEP_LABELS = [
  '학원 정보',
  '운영 시간',
  '수업 기본',
  '수납 기본',
  '교재',

  '상담',
  '완료',
] as const;

export function formatOperatingHours(days: OperatingDayDraft[]): string {
  const enabled = days.filter((d) => d.enabled);
  if (enabled.length === 0) return '';

  const groups: { label: string; start: string; end: string }[] = [];
  let i = 0;
  while (i < enabled.length) {
    const startDay = enabled[i];
    let j = i;
    while (
      j + 1 < enabled.length &&
      enabled[j + 1].start === startDay.start &&
      enabled[j + 1].end === startDay.end &&
      isAdjacentDay(enabled[j].day, enabled[j + 1].day)
    ) {
      j += 1;
    }
    const endDay = enabled[j];
    const label =
      i === j ? startDay.day : `${startDay.day}–${endDay.day}`;
    groups.push({ label, start: startDay.start, end: startDay.end });
    i = j + 1;
  }

  return groups.map((g) => `${g.label} ${g.start}–${g.end}`).join('\n');
}

const WEEKDAYS = new Set<OperatingDayKey>(['월', '화', '수', '목', '금']);

/**
 * 온보딩을 시작하기 전이면 업종 프리셋 운영시간으로 평일 초안을 맞춘다.
 * 이미 진행·완료한 설정은 바꾸지 않는다.
 */
export function operatingDaysFromPreset(
  base: OperatingDayDraft[],
  hours: { day_type?: string; start_time?: string; end_time?: string } | null | undefined,
  onboardingStatus: string
): OperatingDayDraft[] {
  if (onboardingStatus !== 'not_started') return base;
  if (!hours?.start_time || !hours?.end_time) return base;
  return base.map((day) => {
    if (hours.day_type === 'WEEKDAY' && !WEEKDAYS.has(day.day)) return day;
    if (!day.enabled) return day;
    return { ...day, start: hours.start_time as string, end: hours.end_time as string };
  });
}

/** 시작 전 온보딩은 프리셋 레슨 길이, 그 외에는 저장된 값을 쓴다. */
export function initialLessonDurationMinutes(input: {
  savedMinutes?: number | null;
  onboardingStatus: string;
  presetMinutes?: number | null;
}): LessonDurationPreset {
  const preset = input.presetMinutes;
  const presetListed =
    typeof preset === 'number' &&
    (LESSON_DURATION_PRESETS as readonly number[]).includes(preset);
  if (input.onboardingStatus === 'not_started' && presetListed) {
    return preset as LessonDurationPreset;
  }
  const saved = input.savedMinutes;
  if (
    typeof saved === 'number' &&
    (LESSON_DURATION_PRESETS as readonly number[]).includes(saved)
  ) {
    return saved as LessonDurationPreset;
  }
  if (presetListed) return preset as LessonDurationPreset;
  return 50;
}

const DAY_ORDER: OperatingDayKey[] = ['월', '화', '수', '목', '금', '토', '일'];

function isAdjacentDay(a: OperatingDayKey, b: OperatingDayKey): boolean {
  return DAY_ORDER.indexOf(b) - DAY_ORDER.indexOf(a) === 1;
}
