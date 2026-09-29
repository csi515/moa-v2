import type { AcademyEvent, Student } from '@/types';

/** 강사 캘린더: 휴원·조율 공지와 담당 원생 참가 일정만 */
export function visibleStaffCalendarEvents(
  events: AcademyEvent[],
  students: Student[],
  isScoped: boolean,
  scopeRecitalEvents: (events: AcademyEvent[], students: Student[]) => AcademyEvent[]
): AcademyEvent[] {
  if (!isScoped) return events;
  const notices = events.filter(
    (ev) =>
      !(ev.participantIds && ev.participantIds.length > 0) &&
      (ev.type === 'vacation' || ev.type === 'tuning')
  );
  const mine = scopeRecitalEvents(events, students);
  const seen = new Set<string>();
  return [...notices, ...mine].filter((ev) => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  });
}
