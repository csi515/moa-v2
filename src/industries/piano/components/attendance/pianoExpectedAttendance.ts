import type { ClassItem, MakeupItem, Student } from '@/types';
import { weekdayFromIsoDate } from '@/core/academy/utils/weekdayKo';

export interface ExpectedStudentOnDate {
  student: Student;
  /** 해당 요일에 배정된 반(시간표) + 당일 예약된 보강 */
  classes: ClassItem[];
  /** 가장 빠른 시작 시각 (정렬·표시용) */
  earliestStart: string;
}

/**
 * ClassItem에는 특정일 휴강/시간변경/학생 단독 예외 필드가 없다.
 * 지원하는 one-off는 보강(MakeupItem.scheduled)뿐이며, 정규 요일 반복은 그대로 사용한다.
 */
export function getExpectedStudentsOnDate(
  dateIso: string,
  students: Student[],
  classes: ClassItem[],
  options?: { makeups?: MakeupItem[] }
): ExpectedStudentOnDate[] {
  const day = weekdayFromIsoDate(dateIso);
  const classById = new Map(classes.map((c) => [c.id, c]));
  const byStudent = new Map<string, ExpectedStudentOnDate>();

  for (const student of students) {
    if (student.status !== 'active') continue;
    const matched: ClassItem[] = [];
    for (const classId of student.classIds || []) {
      const cls = classById.get(classId);
      if (!cls) continue;
      if (!cls.daysOfWeek.includes(day)) continue;
      matched.push(cls);
    }
    if (matched.length === 0) continue;
    matched.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
    byStudent.set(student.id, {
      student,
      classes: matched,
      earliestStart: matched[0]?.startTime || '99:99',
    });
  }

  const studentById = new Map(students.map((s) => [s.id, s]));
  for (const makeup of options?.makeups || []) {
    if (makeup.status !== 'scheduled' || makeup.makeUpDate !== dateIso) continue;
    const student = studentById.get(makeup.studentId);
    if (!student || student.status !== 'active') continue;
    const slot = makeupAsClass(makeup);
    const existing = byStudent.get(student.id);
    if (existing) {
      if (existing.classes.some((c) => c.id === slot.id)) continue;
      existing.classes = [...existing.classes, slot].sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '')
      );
      existing.earliestStart = existing.classes[0]?.startTime || existing.earliestStart;
      continue;
    }
    byStudent.set(student.id, {
      student,
      classes: [slot],
      earliestStart: slot.startTime || '99:99',
    });
  }

  return Array.from(byStudent.values()).sort((a, b) => {
    const t = a.earliestStart.localeCompare(b.earliestStart);
    if (t !== 0) return t;
    return a.student.name.localeCompare(b.student.name, 'ko');
  });
}

export function makeupAsClass(makeup: MakeupItem): ClassItem {
  return {
    id: `makeup:${makeup.attendanceId}`,
    name: makeup.className ? `보강 · ${makeup.className}` : '보강',
    teacherId: makeup.makeUpTeacherId || '',
    teacherName: makeup.makeUpTeacherName || '',
    daysOfWeek: [],
    startTime: makeup.makeUpStartTime || '',
    endTime: makeup.makeUpEndTime || '',
    capacity: 1,
    room: makeup.makeUpRoom || '',
  };
}

/** 출결 행 부제 — 시간·반 이름 */
export function formatExpectedScheduleLabel(classes: ClassItem[]): string {
  if (classes.length === 0) return '';
  return classes
    .map((c) => {
      const time = c.startTime || '';
      const name = c.name?.trim();
      if (time && name) return `${time} ${name}`;
      return time || name || '';
    })
    .filter(Boolean)
    .join(' · ');
}
