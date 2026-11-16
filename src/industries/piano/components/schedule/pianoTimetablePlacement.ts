/**
 * 피아노 학원 시간표 배치 Facade (Legacy Adapter Shim)
 *
 * 핵심 시간표 배치 알고리즘은 `@/capabilities/scheduling` (timetablePlacementEngine)으로
 * 공식 승격되었으며, 본 모듈은 피아노 학원의 레슨 규격(`resolvePianoLessonMinutes()`)을
 * 기본값으로 주입하여 기존 피아노 UI 및 테스트와의 100% 호환성을 보장합니다.
 */

import type { ClassItem } from '@/types/classItem';
import type { Student } from '@/types/customer';
import type { DayOfWeek } from '@/core/staff/workWindow';
import type { Teacher } from '@/core/staff/teacher';
import { StorageService } from '@/services/storage';
import { resolvePianoLessonMinutes } from '../../config/pianoLessonMinutes';
import {
  TIMETABLE_DAYS,
  TIMETABLE_SLOTS,
  type TimetableSlot,
  resolveTimetableSlots,
  type SlotPlacement,
  timeToMinutes,
  minutesToTime,
  slotHour,
  isEditableSlotClass,
  findEditableSlotClass,
  classesMatchingSlot,
  getPlacementsForSlot,
  ensureEditableSlotClass as baseEnsureEditableSlotClass,
  assignStudentToSlot as baseAssignStudentToSlot,
  removeStudentFromSlot as baseRemoveStudentFromSlot,
  moveStudentToSlot as baseMoveStudentToSlot,
  assignStudentWithRecurrence as baseAssignStudentWithRecurrence,
  type AssignStudentToSlotResult,
  type MoveStudentToSlotResult,
  type AssignWithRecurrenceParams,
  type AssignWithRecurrenceResult,
} from '@/capabilities/scheduling';

const pianoPlacementStore = {
  getStudents: () => StorageService.getStudents(),
  saveStudent: (s: Student) => StorageService.saveStudent(s),
  saveClass: (c: any) => StorageService.saveClass(c),
  getClasses: () => StorageService.getClasses(),
  getRooms: () => StorageService.getSettings()?.rooms || [],
};

export {
  TIMETABLE_DAYS,
  TIMETABLE_SLOTS,
  type TimetableSlot,
  resolveTimetableSlots,
  type SlotPlacement,
  timeToMinutes,
  minutesToTime,
  slotHour,
  isEditableSlotClass,
  findEditableSlotClass,
  classesMatchingSlot,
  getPlacementsForSlot,
  type AssignStudentToSlotResult,
  type MoveStudentToSlotResult,
  type AssignWithRecurrenceParams,
  type AssignWithRecurrenceResult,
};

export function slotEndTime(
  startTime: string,
  durationMinutes = resolvePianoLessonMinutes()
): string {
  const actualDuration = resolvePianoLessonMinutes(durationMinutes);
  const total = timeToMinutes(startTime) + Math.max(1, actualDuration);
  return minutesToTime(total);
}

export function ensureEditableSlotClass(params: {
  classes: ClassItem[];
  day: DayOfWeek;
  startTime: string;
  teachers: Teacher[];
  minCapacity?: number;
  preferredTeacherId?: string;
  createIfMissing?: boolean;
}): ClassItem | null {
  return baseEnsureEditableSlotClass({
    ...params,
    durationMinutes: resolvePianoLessonMinutes(),
    store: pianoPlacementStore,
  });
}

export function assignStudentToSlot(params: {
  student: Student;
  day: DayOfWeek;
  startTime: string;
  classes: ClassItem[];
  teachers: Teacher[];
  preferredTeacherId?: string;
  preferredRoom?: string;
  createClassIfMissing?: boolean;
}): AssignStudentToSlotResult {
  return baseAssignStudentToSlot({
    ...params,
    durationMinutes: resolvePianoLessonMinutes(),
    store: pianoPlacementStore,
  });
}

export function removeStudentFromSlot(params: {
  student: Student;
  classItem: ClassItem;
  day: DayOfWeek;
  startTime: string;
}): { ok: true; student: Student } | { ok: false; message: string } {
  return baseRemoveStudentFromSlot({
    ...params,
    store: pianoPlacementStore,
  });
}

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
  return baseMoveStudentToSlot({
    ...params,
    durationMinutes: resolvePianoLessonMinutes(),
    store: pianoPlacementStore,
  });
}

export function assignStudentWithRecurrence(
  params: AssignWithRecurrenceParams
): AssignWithRecurrenceResult {
  return baseAssignStudentWithRecurrence({
    ...params,
    durationMinutes: resolvePianoLessonMinutes(),
    store: pianoPlacementStore,
  });
}
