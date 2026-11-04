/** 피아노 프리셋 `lessonDurationMinutes` 와 같은 기본 레슨 길이 */
export const PIANO_DEFAULT_LESSON_MINUTES = 30;

/** 설정값이 없으면 피아노 기본 30분. 원장이 고른 값은 그대로 쓴다. */
export function resolvePianoLessonMinutes(configured?: number | null): number {
  if (typeof configured === 'number' && Number.isFinite(configured) && configured > 0) {
    return Math.round(configured);
  }
  return PIANO_DEFAULT_LESSON_MINUTES;
}

export function addMinutesToClock(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10) || 0);
  const total = h * 60 + m + minutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nh = Math.floor(normalized / 60);
  const nm = normalized % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}
