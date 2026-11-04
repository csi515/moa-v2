/** 연습실 UX로 모으는 딥링크. seat-rooms·spaces 는 practice-rooms 와 같은 화면 */
export const PIANO_ROOM_ENTRY_TABS = ['practice-rooms', 'seat-rooms', 'spaces'] as const;

export type PianoScheduleSegment = 'classes' | 'makeups' | 'events' | 'rooms';

const ROOM_ENTRY_SET = new Set<string>(PIANO_ROOM_ENTRY_TABS);

/** 일정 허브 탭 → 시간표/보강/캘린더/연습실 */
export function resolvePianoScheduleSegment(tab: string): PianoScheduleSegment {
  if (tab === 'calendar') return 'events';
  if (tab === 'makeups') return 'makeups';
  if (ROOM_ENTRY_SET.has(tab)) return 'rooms';
  return 'classes';
}
