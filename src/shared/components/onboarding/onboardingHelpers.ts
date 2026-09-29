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
  '출결',
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

const DAY_ORDER: OperatingDayKey[] = ['월', '화', '수', '목', '금', '토', '일'];

function isAdjacentDay(a: OperatingDayKey, b: OperatingDayKey): boolean {
  return DAY_ORDER.indexOf(b) - DAY_ORDER.indexOf(a) === 1;
}
