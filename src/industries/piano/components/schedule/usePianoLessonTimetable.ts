import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { weekdayFromDate } from '@/core/academy/utils/weekdayKo';
import { consumePlaceStudentOnTimetable, peekPlaceStudentOnTimetable } from '@/core/customer/studentJoinInbox';
import { useMediaQuery, useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import type { DayOfWeek, Student } from '@/types';
import type { DragPlacementPayload } from './PianoTimetablePanels';
import {
  TIMETABLE_DAYS,
  assignStudentToSlot,
  getPlacementsForSlot,
  moveStudentToSlot,
  removeStudentFromSlot,
  resolveTimetableSlots,
  type SlotPlacement,
  type TimetableSlot,
} from './pianoTimetablePlacement';

export type TimetableLayoutMode = 'week' | 'byTeacher';

/**
 * 수업 시간표 — 필터·배치·이동·제거.
 * ClassItem + student.classIds만 변경. DAY_ATTENDANCE는 건드리지 않음.
 */
export function usePianoLessonTimetable() {
  const { showToast, openConfirmDialog, triggerRefresh } = useApp();
  const refreshKey = useStorageRefresh('classes');
  const { isScoped, staffId, scopeClasses, scopeStudents } = useStaffScope();
  const useDragGrid = useMediaQuery('(min-width: 1024px) and (hover: hover) and (pointer: fine)');

  const todayDay = weekdayFromDate();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(todayDay);
  const [teacherFilterDraft, setTeacherFilterDraft] = useState('ALL');
  const [layoutMode, setLayoutMode] = useState<TimetableLayoutMode>('week');
  const [pickerSlot, setPickerSlot] = useState<{
    day: DayOfWeek;
    startTime: TimetableSlot;
    preferredTeacherId?: string;
  } | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [pendingTeacherId, setPendingTeacherId] = useState<string | undefined>(undefined);

  const classes = useMemo(
    () => scopeClasses(StorageService.getClasses()),
    [scopeClasses, refreshKey]
  );
  const teachers = useMemo(() => {
    const list = StorageService.getTeachers().filter((t) => t.status === 'active');
    return list.length > 0 ? list : StorageService.getTeachers();
  }, [refreshKey]);
  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()).filter((s) => s.status === 'active'),
    [scopeStudents, refreshKey]
  );

  /** 스코프 강사는 담당만 — draft와 동기화 effect 없이 파생 */
  const teacherFilter = isScoped && staffId ? staffId : teacherFilterDraft;
  const setTeacherFilter = setTeacherFilterDraft;

  const preferredTeacherId = teacherFilter !== 'ALL' ? teacherFilter : undefined;

  const visibleClasses = useMemo(() => {
    if (teacherFilter === 'ALL') return classes;
    return classes.filter((c) => c.teacherId === teacherFilter);
  }, [classes, teacherFilter]);

  const teacherSections = useMemo(() => {
    const byId = new Map<string, { id: string; name: string; classes: typeof classes }>();
    for (const cls of visibleClasses) {
      const id = cls.teacherId || '__none__';
      const name = cls.teacherName?.trim() || teachers.find((t) => t.id === id)?.name || '미배정';
      const bucket = byId.get(id);
      if (bucket) bucket.classes.push(cls);
      else byId.set(id, { id, name, classes: [cls] });
    }
    if (teacherFilter === 'ALL' && layoutMode === 'byTeacher') {
      for (const t of teachers) {
        if (!byId.has(t.id)) byId.set(t.id, { id: t.id, name: t.name, classes: [] });
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [visibleClasses, teachers, teacherFilter, layoutMode]);

  const placedIds = useMemo(() => {
    const ids = new Set<string>();
    const slots = resolveTimetableSlots(visibleClasses);
    for (const day of TIMETABLE_DAYS) {
      for (const slot of slots) {
        getPlacementsForSlot(students, visibleClasses, day, slot).forEach((p) =>
          ids.add(p.student.id)
        );
      }
    }
    return ids;
  }, [students, visibleClasses]);

  const newClassConfirmMessage = (
    studentName: string,
    day: DayOfWeek,
    startTime: string,
    teacherId?: string
  ) => {
    const teacher = teacherId ? teachers.find((t) => t.id === teacherId) : undefined;
    // 실제 생성 시 resolveTeacher와 동일: preferred 없으면 미배정
    const teacherLine = `\n담당 강사: ${teacher?.name || '미배정'}`;
    return (
      `${day}요일 ${startTime}에는 아직 반이 없습니다.\n` +
      `「${day} ${startTime}」 반을 새로 만들고 ${studentName} 학생을 배치할까요?` +
      teacherLine +
      `\n\n확인하면 반 관리 목록에도 이 반이 추가됩니다.`
    );
  };

  const finishPlaceSuccess = (
    studentName: string,
    day: DayOfWeek,
    startTime: string,
    createdClass: boolean
  ) => {
    showToast(
      createdClass
        ? `${studentName} 학생을 ${day}요일 ${startTime}에 배치했습니다. (새 반 「${day} ${startTime}」 생성)`
        : `${studentName} 학생을 ${day}요일 ${startTime}에 배치했습니다.`,
      'success'
    );
    setPendingStudentId(null);
    setPendingTeacherId(undefined);
    setPickerSlot(null);
    triggerRefresh();
  };

  const placeStudent = (
    student: Student,
    day: DayOfWeek,
    startTime: TimetableSlot,
    teacherId?: string
  ) => {
    const preferred = teacherId || preferredTeacherId;
    const result = assignStudentToSlot({
      student,
      day,
      startTime,
      classes,
      teachers,
      preferredTeacherId: preferred,
      createClassIfMissing: false,
    });
    if (result.ok === true) {
      finishPlaceSuccess(student.name, day, startTime, result.createdClass);
    } else if (result.needsNewClass === true) {
      openConfirmDialog({
        title: '새 반을 만들어 배치',
        message: newClassConfirmMessage(student.name, day, startTime, preferred),
        confirmText: '반 만들고 배치',
        cancelText: '취소',
        onConfirm: () => {
          const created = assignStudentToSlot({
            student,
            day,
            startTime,
            classes: StorageService.getClasses(),
            teachers,
            preferredTeacherId: preferred,
            createClassIfMissing: true,
          });
          if (created.ok === false) {
            showToast(created.message, 'warning');
            return;
          }
          finishPlaceSuccess(student.name, day, startTime, created.createdClass);
        },
      });
    } else {
      showToast(result.message, 'warning');
    }
  };

  const movePlacement = (
    payload: DragPlacementPayload,
    day: DayOfWeek,
    startTime: TimetableSlot,
    sectionTeacherId?: string
  ) => {
    if (payload.day === day && payload.startTime === startTime) return;
    const student = students.find((s) => s.id === payload.studentId);
    const fromClass = classes.find((c) => c.id === payload.classId);
    if (!student || !fromClass) return;

    const preferred = sectionTeacherId || preferredTeacherId;
    const from = { classItem: fromClass, day: payload.day, startTime: payload.startTime };

    const result = moveStudentToSlot({
      student,
      from,
      toDay: day,
      toStartTime: startTime,
      classes,
      teachers,
      preferredTeacherId: preferred,
      createClassIfMissing: false,
    });
    if (result.ok === true) {
      showToast(
        result.createdClass
          ? `${student.name} 학생을 ${day}요일 ${startTime}(으)로 이동했습니다. (새 반 「${day} ${startTime}」 생성)`
          : `${student.name} 학생을 ${day}요일 ${startTime}(으)로 이동했습니다.`,
        'success'
      );
      triggerRefresh();
    } else if (result.needsNewClass === true) {
      openConfirmDialog({
        title: '새 반을 만들어 이동',
        message: newClassConfirmMessage(student.name, day, startTime, preferred),
        confirmText: '반 만들고 이동',
        cancelText: '취소',
        onConfirm: () => {
          const moved = moveStudentToSlot({
            student,
            from,
            toDay: day,
            toStartTime: startTime,
            classes: StorageService.getClasses(),
            teachers,
            preferredTeacherId: preferred,
            createClassIfMissing: true,
          });
          if (moved.ok === false) {
            showToast(moved.message, 'warning');
            return;
          }
          showToast(
            moved.createdClass
              ? `${student.name} 학생을 ${day}요일 ${startTime}(으)로 이동했습니다. (새 반 「${day} ${startTime}」 생성)`
              : `${student.name} 학생을 ${day}요일 ${startTime}(으)로 이동했습니다.`,
            'success'
          );
          triggerRefresh();
        },
      });
    } else {
      showToast(result.message, 'warning');
    }
  };

  const handleDropStudent = (studentId: string, day: DayOfWeek, startTime: TimetableSlot) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    placeStudent(student, day, startTime);
  };

  const handleRemove = (placement: SlotPlacement, day: DayOfWeek, startTime: TimetableSlot) => {
    openConfirmDialog({
      title: '배치 제거',
      message: `${placement.student.name} 학생을 ${day}요일 ${startTime} 예정에서 제거할까요?\n(출결 기록은 변경되지 않습니다.)`,
      confirmText: '제거',
      onConfirm: () => {
        const result = removeStudentFromSlot({
          student: placement.student,
          classItem: placement.classItem,
          day,
          startTime,
        });
        if (result.ok === false) {
          showToast(result.message, 'warning');
          return;
        }
        showToast(`${placement.student.name} 학생 배치를 제거했습니다.`, 'info');
        triggerRefresh();
      },
    });
  };

  const openPickerForSlot = (
    day: DayOfWeek,
    startTime: TimetableSlot,
    sectionTeacherId?: string
  ) => {
    setPendingStudentId(null);
    setPendingTeacherId(sectionTeacherId);
    setPickerQuery('');
    setPickerSlot({ day, startTime, preferredTeacherId: sectionTeacherId });
  };

  const startPlaceStudent = (student: Student, sectionTeacherId?: string) => {
    setPickerSlot(null);
    setPendingStudentId(student.id);
    setPendingTeacherId(sectionTeacherId);
    showToast(`${student.name} 학생을 배치할 시간대를 탭하세요.`, 'info');
  };

  /** 신규 등록 →「시간표에 배치」: 목록에 학생이 보이면 배치 대기 상태로 연다 */
  useEffect(() => {
    const studentId = peekPlaceStudentOnTimetable();
    if (!studentId) return;
    const student = students.find((s) => s.id === studentId);
    if (!student) return;
    consumePlaceStudentOnTimetable();
    setPickerSlot(null);
    setPendingStudentId(student.id);
    setPendingTeacherId(undefined);
    showToast(
      `${student.name} 학생은 아직 미배치입니다. 배치할 시간대를 탭하거나 드래그하세요.`,
      'info'
    );
  }, [students, showToast]);

  const placePending = (day: DayOfWeek, startTime: TimetableSlot, sectionTeacherId?: string) => {
    const student = students.find((s) => s.id === pendingStudentId);
    if (student) placeStudent(student, day, startTime, sectionTeacherId || pendingTeacherId);
  };

  const pickerExcludeIds = useMemo(() => {
    if (!pickerSlot) return undefined;
    return new Set(
      getPlacementsForSlot(
        students,
        visibleClasses,
        pickerSlot.day,
        pickerSlot.startTime
      ).map((p) => p.student.id)
    );
  }, [pickerSlot, students, visibleClasses]);

  return {
    useDragGrid,
    todayDay,
    selectedDay,
    setSelectedDay,
    teacherFilter,
    setTeacherFilter,
    layoutMode,
    setLayoutMode,
    pickerSlot,
    setPickerSlot,
    pickerQuery,
    setPickerQuery,
    pickerExcludeIds,
    pendingStudentId,
    isScoped,
    teachers,
    students,
    visibleClasses,
    teacherSections,
    placedIds,
    placeStudent,
    movePlacement,
    handleDropStudent,
    handleRemove,
    openPickerForSlot,
    startPlaceStudent,
    placePending,
  };
}
