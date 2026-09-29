import type { ClassItem, DayOfWeek, Student, Teacher } from '@/types';
import { StorageService } from '@/services/storage';
import {
  findClassConflicts,
  formatConflictSummary,
  type ClassSlotCandidate,
} from '@/core/academy/utils/scheduleConflicts';

export const TIMETABLE_DAYS: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];

/** 30분 단위 편집 슬롯 (09:00 ~ 20:30) */
export const TIMETABLE_SLOTS = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
] as const;

/** 기본 슬롯 또는 등록 반 시작시각(동적 확장) — 리터럴 유니온에 묶지 않음 */
export type TimetableSlot = string;

const BASE_SLOT_SET: ReadonlySet<string> = new Set(
  TIMETABLE_SLOTS as readonly string[]
);

/**
 * 기본 09:00~20:30(30분) + 실제 등록된 ClassItem 시작시각만 추가.
 * 범위 밖(예: 21:00)·비 30분 시작시각도 행으로 남겨 반이 사라지지 않게 한다.
 */
export function resolveTimetableSlots(classes: ClassItem[]): string[] {
  const result: string[] = [...(TIMETABLE_SLOTS as readonly string[])];
  const seen = new Set(result);
  for (const cls of classes) {
    const st = (cls.startTime || '').trim();
    if (!st || seen.has(st)) continue;
    seen.add(st);
    result.push(st);
  }
  return result.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export interface SlotPlacement {
  student: Student;
  classItem: ClassItem;
  /** 단일 요일·슬롯 시작시각이 일치하는 반만 시간표에서 이동/제거 가능 */
  editable: boolean;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((n) => parseInt(n, 10) || 0);
  return h * 60 + m;
}

export function slotEndTime(startTime: string): string {
  const total = timeToMinutes(startTime) + 50;
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

export function slotHour(time: string): number {
  return parseInt(time.split(':')[0], 10) || 0;
}

/** 시간표에서 직접 편집 가능한 슬롯용 클래스 (단일 요일 + 슬롯 시작시각) */
export function isEditableSlotClass(
  cls: ClassItem,
  day: DayOfWeek,
  startTime: string
): boolean {
  return (
    cls.daysOfWeek.length === 1 &&
    cls.daysOfWeek[0] === day &&
    cls.startTime === startTime
  );
}

export function findEditableSlotClass(
  classes: ClassItem[],
  day: DayOfWeek,
  startTime: string,
  preferredTeacherId?: string
): ClassItem | undefined {
  const matches = classes.filter((cls) => isEditableSlotClass(cls, day, startTime));
  if (preferredTeacherId) {
    return matches.find((cls) => cls.teacherId === preferredTeacherId);
  }
  return matches[0];
}

/**
 * 해당 슬롯에 표시할 반.
 * - 시작시각이 슬롯과 일치하면 표시
 * - 아니면 [slot, slot+30) 구간에 속하되, 그 시작시각이 시간표에 전용 행으로 있으면 해당 행에만 표시
 * 편집은 isEditableSlotClass(정확한 startTime).
 */
export function classesMatchingSlot(
  classes: ClassItem[],
  day: DayOfWeek,
  startTime: string,
  slotList?: readonly string[]
): ClassItem[] {
  const slots = slotList ?? resolveTimetableSlots(classes);
  const slotStart = timeToMinutes(startTime);
  const slotEnd = slotStart + 30;
  return classes.filter((cls) => {
    if (!cls.daysOfWeek.includes(day)) return false;
    const st = cls.startTime || '00:00';
    if (st === startTime) return true;
    // 전용 슬롯 행이 있으면 30분 창 중복 표시 방지
    if (slots.includes(st)) return false;
    const t = timeToMinutes(st);
    return t >= slotStart && t < slotEnd;
  });
}

export function getPlacementsForSlot(
  students: Student[],
  classes: ClassItem[],
  day: DayOfWeek,
  startTime: string
): SlotPlacement[] {
  const slots = resolveTimetableSlots(classes);
  const matching = classesMatchingSlot(classes, day, startTime, slots);
  const byStudent = new Map<string, SlotPlacement>();

  for (const cls of matching) {
    for (const student of students) {
      if (student.status !== 'active') continue;
      if (!student.classIds?.includes(cls.id)) continue;
      const editable = isEditableSlotClass(cls, day, startTime);
      const prev = byStudent.get(student.id);
      if (!prev || (editable && !prev.editable)) {
        byStudent.set(student.id, { student, classItem: cls, editable });
      }
    }
  }

  return Array.from(byStudent.values()).sort((a, b) =>
    a.student.name.localeCompare(b.student.name, 'ko')
  );
}

/** preferredTeacherId가 있으면 해당 강사, 없으면 미배정. 임의 자동 배정하지 않음. */
function resolveTeacher(
  teachers: Teacher[],
  preferredTeacherId?: string
): Pick<Teacher, 'id' | 'name'> {
  if (preferredTeacherId) {
    const preferred = teachers.find((t) => t.id === preferredTeacherId);
    if (preferred) return { id: preferred.id, name: preferred.name };
  }
  return { id: '', name: '미배정' };
}

function defaultRoom(): string {
  const settings = StorageService.getSettings();
  const room = settings.rooms?.find((r) => r.name)?.name;
  return room || '연습실';
}

/** 시간표에서 새로 만들 반 후보 (반 관리 생성과 동일 필드) */
function buildNewSlotClassCandidate(
  day: DayOfWeek,
  startTime: string,
  teachers: Teacher[],
  preferredTeacherId?: string
): ClassSlotCandidate {
  const teacher = resolveTeacher(teachers, preferredTeacherId);
  return {
    teacherId: teacher.id,
    room: defaultRoom(),
    daysOfWeek: [day],
    startTime,
    endTime: slotEndTime(startTime),
  };
}

function newClassConflictMessage(
  conflicts: ReturnType<typeof findClassConflicts>
): string {
  return (
    `새 반을 만들 수 없습니다. 강사 또는 연습실 일정이 겹칩니다.\n\n` +
    formatConflictSummary(conflicts)
  );
}

/** 슬롯용 ClassItem 확보. createIfMissing=false이면 없으면 null (자동 생성 안 함).
 * 기존 반의 capacity는 변경하지 않는다. (학생 배치로 정원 자동 증가 금지)
 */
export function ensureEditableSlotClass(params: {
  classes: ClassItem[];
  day: DayOfWeek;
  startTime: string;
  teachers: Teacher[];
  minCapacity?: number;
  preferredTeacherId?: string;
  /** false면 기존 반만 반환. 없으면 null */
  createIfMissing?: boolean;
}): ClassItem | null {
  const existing = findEditableSlotClass(
    params.classes,
    params.day,
    params.startTime,
    params.preferredTeacherId
  );
  const minCapacity = Math.max(params.minCapacity ?? 4, 1);

  if (existing) {
    return existing;
  }

  if (!params.createIfMissing) return null;

  const teacher = resolveTeacher(params.teachers, params.preferredTeacherId);
  return StorageService.saveClass({
    name: `${params.day} ${params.startTime}`,
    teacherId: teacher.id,
    teacherName: teacher.name,
    daysOfWeek: [params.day],
    startTime: params.startTime,
    endTime: slotEndTime(params.startTime),
    capacity: minCapacity,
    room: defaultRoom(),
    color: '#4f46e5',
  });
}

function saveStudentClassIds(student: Student, classIds: string[]): Student {
  return StorageService.saveStudent({
    ...student,
    classIds,
  });
}

export type AssignStudentToSlotResult =
  | { ok: true; classItem: ClassItem; student: Student; createdClass: boolean }
  | { ok: false; message: string; needsNewClass?: false }
  | { ok: false; needsNewClass: true; message: string };

/**
 * 같은 요일의 다른 편집 가능 슬롯에서 학생을 제거한 뒤 대상 슬롯에 배치.
 * 복수 요일 반(class) 소속은 유지한다. 출결(DAY_ATTENDANCE)은 변경하지 않음.
 * createClassIfMissing=false(기본)이면 반이 없을 때 생성하지 않고 needsNewClass를 반환한다.
 */
export function assignStudentToSlot(params: {
  student: Student;
  day: DayOfWeek;
  startTime: string;
  classes: ClassItem[];
  teachers: Teacher[];
  preferredTeacherId?: string;
  /** true일 때만 슬롯 반이 없을 때 ClassItem을 생성한다 */
  createClassIfMissing?: boolean;
}): AssignStudentToSlotResult {
  const { student, day, startTime, teachers, preferredTeacherId } = params;
  const createClassIfMissing = params.createClassIfMissing === true;
  const classes = [...params.classes];

  if (student.status !== 'active') {
    return { ok: false, message: '재원 학생만 시간표에 배치할 수 있습니다.' };
  }

  const already = getPlacementsForSlot([student], classes, day, startTime);
  if (already.some((p) => p.student.id === student.id && p.editable)) {
    return { ok: false, message: '이미 해당 시간대에 배치되어 있습니다.' };
  }

  // 같은 요일의 다른 단일 슬롯에서 제거 (하루 한 레슨 시간 기준)
  let nextIds = [...(student.classIds || [])];
  for (const cls of classes) {
    if (!nextIds.includes(cls.id)) continue;
    if (cls.daysOfWeek.length !== 1 || cls.daysOfWeek[0] !== day) continue;
    if (cls.startTime === startTime) continue;
    nextIds = nextIds.filter((id) => id !== cls.id);
  }

  const currentInSlot = getPlacementsForSlot(
    StorageService.getStudents().filter((s) => s.id !== student.id),
    preferredTeacherId
      ? classes.filter((c) => c.teacherId === preferredTeacherId)
      : classes,
    day,
    startTime
  ).length;

  const existingSlotClass = findEditableSlotClass(
    classes,
    day,
    startTime,
    preferredTeacherId
  );
  if (!existingSlotClass && !createClassIfMissing) {
    return {
      ok: false,
      needsNewClass: true,
      message: '이 시간대에 반이 없습니다. 새 반을 만들어 배치할 수 있습니다.',
    };
  }

  if (existingSlotClass && currentInSlot >= existingSlotClass.capacity) {
    return {
      ok: false,
      message: `반 정원(${existingSlotClass.capacity}명)이 가득 찼습니다. 반 관리에서 정원을 늘린 뒤 다시 배치해 주세요.`,
    };
  }

  // 새 반 생성 시에만 강사·연습실 충돌 검사 (기존 반 재사용 경로는 유지)
  if (!existingSlotClass && createClassIfMissing) {
    const conflicts = findClassConflicts(
      classes,
      buildNewSlotClassCandidate(day, startTime, teachers, preferredTeacherId)
    );
    if (conflicts.length > 0) {
      return { ok: false, message: newClassConflictMessage(conflicts) };
    }
  }

  const slotClass = ensureEditableSlotClass({
    classes,
    day,
    startTime,
    teachers,
    minCapacity: currentInSlot + 1,
    preferredTeacherId,
    createIfMissing: createClassIfMissing,
  });

  if (!slotClass) {
    return {
      ok: false,
      needsNewClass: true,
      message: '이 시간대에 반이 없습니다. 새 반을 만들어 배치할 수 있습니다.',
    };
  }

  if (!nextIds.includes(slotClass.id)) {
    nextIds = [...nextIds, slotClass.id];
  }

  const saved = saveStudentClassIds(student, nextIds);
  return {
    ok: true,
    classItem: slotClass,
    student: saved,
    createdClass: !existingSlotClass,
  };
}

export function removeStudentFromSlot(params: {
  student: Student;
  classItem: ClassItem;
  day: DayOfWeek;
  startTime: string;
}): { ok: true; student: Student } | { ok: false; message: string } {
  const { student, classItem, day, startTime } = params;
  if (!isEditableSlotClass(classItem, day, startTime)) {
    return {
      ok: false,
      message: '여러 요일·슬롯과 다른 시작 시각의 반은 반 관리에서 수정해 주세요.',
    };
  }
  const nextIds = (student.classIds || []).filter((id) => id !== classItem.id);
  const saved = saveStudentClassIds(student, nextIds);
  return { ok: true, student: saved };
}

export type MoveStudentToSlotResult =
  | { ok: true; student: Student; createdClass: boolean }
  | { ok: false; message: string; needsNewClass?: false }
  | { ok: false; needsNewClass: true; message: string };

export function moveStudentToSlot(params: {
  student: Student;
  from?: { classItem: ClassItem; day: DayOfWeek; startTime: string };
  toDay: DayOfWeek;
  toStartTime: string;
  classes: ClassItem[];
  teachers: Teacher[];
  preferredTeacherId?: string;
  createClassIfMissing?: boolean;
}): MoveStudentToSlotResult {
  const createClassIfMissing = params.createClassIfMissing === true;

  // 대상 슬롯에 반이 없으면, 원 슬롯에서 제거하기 전에 확인을 받도록 needsNewClass 반환
  if (
    !createClassIfMissing &&
    !findEditableSlotClass(
      params.classes,
      params.toDay,
      params.toStartTime,
      params.preferredTeacherId
    )
  ) {
    return {
      ok: false,
      needsNewClass: true,
      message: '이 시간대에 반이 없습니다. 새 반을 만들어 배치할 수 있습니다.',
    };
  }

  // 대상 반 정원 초과면 원 슬롯 제거 전에 거부 (부분 이동 방지)
  const targetClass = findEditableSlotClass(
    params.classes,
    params.toDay,
    params.toStartTime,
    params.preferredTeacherId
  );
  if (targetClass) {
    const scopedClasses = params.preferredTeacherId
      ? params.classes.filter((c) => c.teacherId === params.preferredTeacherId)
      : params.classes;
    const currentInTarget = getPlacementsForSlot(
      StorageService.getStudents().filter((s) => s.id !== params.student.id),
      scopedClasses,
      params.toDay,
      params.toStartTime
    ).length;
    if (currentInTarget >= targetClass.capacity) {
      return {
        ok: false,
        message: `반 정원(${targetClass.capacity}명)이 가득 찼습니다. 반 관리에서 정원을 늘린 뒤 다시 배치해 주세요.`,
      };
    }
  } else if (createClassIfMissing) {
    // 새 반 생성 전 충돌 검사 — 원 슬롯 제거보다 먼저
    const conflicts = findClassConflicts(
      params.classes,
      buildNewSlotClassCandidate(
        params.toDay,
        params.toStartTime,
        params.teachers,
        params.preferredTeacherId
      )
    );
    if (conflicts.length > 0) {
      return { ok: false, message: newClassConflictMessage(conflicts) };
    }
  }

  let student = params.student;
  let classes = params.classes;

  if (params.from) {
    const removed = removeStudentFromSlot({
      student,
      classItem: params.from.classItem,
      day: params.from.day,
      startTime: params.from.startTime,
    });
    if (removed.ok === false) {
      return { ok: false, message: removed.message };
    }
    student = removed.student;
    classes = StorageService.getClasses();
  }

  const assigned = assignStudentToSlot({
    student,
    day: params.toDay,
    startTime: params.toStartTime,
    classes,
    teachers: params.teachers,
    preferredTeacherId: params.preferredTeacherId,
    createClassIfMissing,
  });
  if (!assigned.ok) return assigned;
  return { ok: true, student: assigned.student, createdClass: assigned.createdClass };
}
