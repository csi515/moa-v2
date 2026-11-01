/**
 * 피아노 업종 전용 탭 및 URL 별칭(Alias) 캐노니컬 정규화 정의부
 *
 * 브라우저 주소창, 딥링크, 사이드바 하이라이트 간의 경로 불일치를 방지하고
 * 단일 진실 공급원(SSOT) 캐노니컬 URL로 자동 정규화합니다.
 */

export const PIANO_CANONICAL_TAB_MAP: Record<string, string> = {
  // 출결 허브 별칭 -> 캐노니컬 'attendance'
  lessons: 'attendance',
  'check-in': 'attendance',

  // 원생 허브 별칭 -> 캐노니컬 'students'
  roster: 'students',
  members: 'students',
  customers: 'students',

  // 연습실 허브 별칭 -> 캐노니컬 'practice-rooms'
  'seat-rooms': 'practice-rooms',
  spaces: 'practice-rooms',

  // 수납/청구 별칭 -> 캐노니컬 'tuition'
  billing: 'tuition',
  'billing-invoices': 'tuition',

  // 일정/시간표 별칭 -> 캐노니컬 'timetable'
  schedules: 'timetable',

  // 상담 별칭 -> 캐노니컬 'consultations'
  consultation: 'consultations',
};

/**
 * 주어진 탭 이름이 피아노 업종의 별칭(alias)인 경우 캐노니컬 탭 식별자를 반환합니다.
 * 별칭이 아닌 이미 캐노니컬이거나 알 수 없는 탭인 경우 null을 반환합니다.
 */
export function resolvePianoCanonicalTab(tab: string): string | null {
  return PIANO_CANONICAL_TAB_MAP[tab] ?? null;
}
