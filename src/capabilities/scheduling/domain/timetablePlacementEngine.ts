/**
 * Moa-v2 범용 시간표 배치 엔진 (Timetable Placement Engine)
 *
 * 교과/레슨 교육, 스포츠/피트니스, 체육관, 개인 레슨 등
 * 시간표 기반(Timetable-based) 업종 전체가 공유하는 핵심 스케줄링 도메인.
 */

import type { ClassItem } from '@/types/classItem';
import type { Student } from '@/types/customer';
import type { DayOfWeek } from '@/core/staff/workWindow';
import type { Teacher } from '@/core/staff/teacher';
import {
  findClassConflicts,
  formatConflictSummary,
  type ClassSlotCandidate,
} from '../utils/scheduleConflicts';
import { timeToMinutes } from './calendarConstraintEngine';

export interface TimetablePlacementStore {
  getStudents?: () => Student[];
  saveStudent?: (student: Student) => Student;
  saveClass?: (classItem: Omit<ClassItem, 'id'> & { id?: string }) => ClassItem;
  getClasses?: () => ClassItem[];
  getRooms?: () => Array<{ id?: string; name: string }>;
}

export const TIMETABLE_DAYS: DayOfWeek[] = ['월', '화', '수', '목', '금', '토', '일'];

/** 30분 단위 표준 편집 슬롯 (09:00 ~ 20:30) */
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

export type TimetableSlot = string;

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

export function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function slotEndTime(
  startTime: string,
  durationMinutes = 30
): string {
  const total = timeToMinutes(startTime) + Math.max(1, durationMinutes);
  return minutesToTime(total);
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

function defaultRoom(store?: TimetablePlacementStore): string {
  const rooms = store?.getRooms?.();
  const room = rooms?.find((r) => r.name)?.name;
  return room || '기본공간';
}

function buildNewSlotClassCandidate(
  day: DayOfWeek,
  startTime: string,
  teachers: Teacher[],
  preferredTeacherId?: string,
  durationMinutes = 30,
  store?: TimetablePlacementStore
): ClassSlotCandidate {
  const teacher = resolveTeacher(teachers, preferredTeacherId);
  return {
    teacherId: teacher.id,
    room: defaultRoom(store),
    daysOfWeek: [day],
    startTime,
    endTime: slotEndTime(startTime, durationMinutes),
  };
}

function newClassConflictMessage(
  conflicts: ReturnType<typeof findClassConflicts>
): string {
  return (
    `새 반을 만들 수 없습니다. 강사 또는 공간 일정이 겹칩니다.\n\n` +
    formatConflictSummary(conflicts)
  );
}

export function ensureEditableSlotClass(params: {
  classes: ClassItem[];
  day: DayOfWeek;
  startTime: string;
  teachers: Teacher[];
  minCapacity?: number;
  preferredTeacherId?: string;
  createIfMissing?: boolean;
  durationMinutes?: number;
  store?: TimetablePlacementStore;
}): ClassItem | null {
  const existing = findEditableSlotClass(
    params.classes,
    params.day,
    params.startTime,
    params.preferredTeacherId
  );
  const minCapacity = Math.max(params.minCapacity ?? 4, 1);
  const duration = params.durationMinutes ?? 30;

  if (existing) {
    return existing;
  }

  if (!params.createIfMissing) return null;

  const teacher = resolveTeacher(params.teachers, params.preferredTeacherId);
  const candidate = {
    name: `${params.day} ${params.startTime}`,
    teacherId: teacher.id,
    teacherName: teacher.name,
    daysOfWeek: [params.day],
    startTime: params.startTime,
    endTime: slotEndTime(params.startTime, duration),
    capacity: minCapacity,
    room: defaultRoom(params.store),
    color: '#4f46e5',
  };

  if (params.store?.saveClass) {
    return params.store.saveClass(candidate);
  }

  return {
    id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...candidate,
  };
}

function saveStudentClassIds(
  student: Student,
  classIds: string[],
  store?: TimetablePlacementStore
): Student {
  const updated = {
    ...student,
    classIds,
  };
  if (store?.saveStudent) {
    return store.saveStudent(updated);
  }
  return updated;
}

export type AssignStudentToSlotResult =
  | { ok: true; classItem: ClassItem; student: Student; createdClass: boolean }
  | { ok: false; message: string; needsNewClass?: false }
  | { ok: false; needsNewClass: true; message: string };

export function assignStudentToSlot(params: {
  student: Student;
  day: DayOfWeek;
  startTime: string;
  classes: ClassItem[];
  teachers: Teacher[];
  preferredTeacherId?: string;
  preferredRoom?: string;
  createClassIfMissing?: boolean;
  durationMinutes?: number;
  store?: TimetablePlacementStore;
}): AssignStudentToSlotResult {
  const { student, day, startTime, teachers, preferredTeacherId, store } = params;
  const createClassIfMissing = params.createClassIfMissing === true;
  const classes = [...params.classes];
  const duration = params.durationMinutes ?? 30;

  if (student.status !== 'active') {
    return { ok: false, message: '재원 회원만 시간표에 배치할 수 있습니다.' };
  }

  const already = getPlacementsForSlot([student], classes, day, startTime);
  if (already.some((p) => p.student.id === student.id && p.editable)) {
    return { ok: false, message: '이미 해당 시간대에 배치되어 있습니다.' };
  }

  // 같은 요일의 다른 단일 슬롯에서 제거
  let nextIds = [...(student.classIds || [])];
  for (const cls of classes) {
    if (!nextIds.includes(cls.id)) continue;
    if (cls.daysOfWeek.length !== 1 || cls.daysOfWeek[0] !== day) continue;
    if (cls.startTime === startTime) continue;
    nextIds = nextIds.filter((id) => id !== cls.id);
  }

  const existingStudents = store?.getStudents?.() || [];
  const currentInSlot = getPlacementsForSlot(
    existingStudents.filter((s) => s.id !== student.id),
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

  if (!existingSlotClass && createClassIfMissing) {
    const conflicts = findClassConflicts(
      classes,
      buildNewSlotClassCandidate(day, startTime, teachers, preferredTeacherId, duration, store)
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
    durationMinutes: duration,
    store,
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

  const saved = saveStudentClassIds(student, nextIds, store);
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
  store?: TimetablePlacementStore;
}): { ok: true; student: Student } | { ok: false; message: string } {
  const { student, classItem, day, startTime, store } = params;
  if (!isEditableSlotClass(classItem, day, startTime)) {
    return {
      ok: false,
      message: '여러 요일·슬롯과 다른 시작 시각의 반은 반 관리에서 수정해 주세요.',
    };
  }
  const nextIds = (student.classIds || []).filter((id) => id !== classItem.id);
  const saved = saveStudentClassIds(student, nextIds, store);
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
  durationMinutes?: number;
  store?: TimetablePlacementStore;
}): MoveStudentToSlotResult {
  const { store } = params;
  const createClassIfMissing = params.createClassIfMissing === true;
  const duration = params.durationMinutes ?? 30;

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
    const existingStudents = store?.getStudents?.() || [];
    const currentInTarget = getPlacementsForSlot(
      existingStudents.filter((s) => s.id !== params.student.id),
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
    const conflicts = findClassConflicts(
      params.classes,
      buildNewSlotClassCandidate(
        params.toDay,
        params.toStartTime,
        params.teachers,
        params.preferredTeacherId,
        duration,
        store
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
      store,
    });
    if (removed.ok === false) {
      return { ok: false, message: removed.message };
    }
    student = removed.student;
    classes = store?.getClasses?.() || classes;
  }

  const assigned = assignStudentToSlot({
    student,
    day: params.toDay,
    startTime: params.toStartTime,
    classes,
    teachers: params.teachers,
    preferredTeacherId: params.preferredTeacherId,
    createClassIfMissing,
    durationMinutes: duration,
    store,
  });
  if (!assigned.ok) return assigned;
  return { ok: true, student: assigned.student, createdClass: assigned.createdClass };
}

export interface AssignWithRecurrenceParams {
  student: Student;
  days: DayOfWeek[];
  startTime: string;
  classes: ClassItem[];
  teachers: Teacher[];
  preferredTeacherId?: string;
  preferredRoom?: string;
  createClassIfMissing?: boolean;
  durationMinutes?: number;
  store?: TimetablePlacementStore;
}

export type AssignWithRecurrenceResult =
  | {
      ok: true;
      student: Student;
      createdClassCount: number;
      assignedDays: DayOfWeek[];
      message: string;
    }
  | {
      ok: false;
      message: string;
      needsNewClass?: boolean;
      missingDays?: DayOfWeek[];
    };

export function assignStudentWithRecurrence(
  params: AssignWithRecurrenceParams
): AssignWithRecurrenceResult {
  const { student, days, startTime, teachers, preferredTeacherId } = params;
  const createClassIfMissing = params.createClassIfMissing === true;
  const duration = params.durationMinutes ?? 30;
  let currentClasses = [...params.classes];

  if (student.status !== 'active') {
    return { ok: false, message: '재원 회원만 시간표에 배치할 수 있습니다.' };
  }
  if (!days || days.length === 0) {
    return { ok: false, message: '최소 1개 이상의 요일을 선택해야 합니다.' };
  }

  if (!createClassIfMissing) {
    const missingDays = days.filter(
      (day) => !findEditableSlotClass(currentClasses, day, startTime, preferredTeacherId)
    );
    if (missingDays.length > 0) {
      return {
        ok: false,
        needsNewClass: true,
        missingDays,
        message: `${missingDays.join(', ')}요일 ${startTime}에 반이 없습니다. 새 반을 생성하여 배치할까요?`,
      };
    }
  }

  let nextIds = [...(student.classIds || [])];
  let createdCount = 0;
  const assignedDays: DayOfWeek[] = [];

  for (const day of days) {
    for (const cls of currentClasses) {
      if (!nextIds.includes(cls.id)) continue;
      if (cls.daysOfWeek.length !== 1 || cls.daysOfWeek[0] !== day) continue;
      if (cls.startTime === startTime) continue;
      nextIds = nextIds.filter((id) => id !== cls.id);
    }

    const existingSlotClass = findEditableSlotClass(
      currentClasses,
      day,
      startTime,
      preferredTeacherId
    );

    if (!existingSlotClass && createClassIfMissing) {
      const conflicts = findClassConflicts(
        currentClasses,
        buildNewSlotClassCandidate(day, startTime, teachers, preferredTeacherId, duration, params.store)
      );
      if (conflicts.length > 0) {
        return {
          ok: false,
          message: `${day}요일 새 반을 만들 수 없습니다:\n${formatConflictSummary(conflicts)}`,
        };
      }
    }

    const slotClass = ensureEditableSlotClass({
      classes: currentClasses,
      day,
      startTime,
      teachers,
      preferredTeacherId,
      createIfMissing: createClassIfMissing,
      durationMinutes: duration,
      store: params.store,
    });

    if (!slotClass) {
      return {
        ok: false,
        message: `${day}요일 ${startTime} 반을 생성하거나 찾을 수 없습니다.`,
      };
    }

    if (!existingSlotClass) {
      createdCount++;
      currentClasses = params.store?.getClasses?.() || currentClasses;
    }

    if (!nextIds.includes(slotClass.id)) {
      nextIds.push(slotClass.id);
    }
    assignedDays.push(day);
  }

  const updatedStudent = saveStudentClassIds(student, nextIds, params.store);

  return {
    ok: true,
    student: updatedStudent,
    createdClassCount: createdCount,
    assignedDays,
    message: `${student.name} 회원을 ${assignedDays.join('·')}요일 ${startTime}에 배치했습니다.`,
  };
}
