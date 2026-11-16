import { useCallback, useMemo } from 'react';
import { usePermissions } from '@/core/auth/usePermissions';
import { useActiveUser } from '@/shared/session/useActiveUser';
import { StorageService } from '@/services/storage';
import type { Booking } from '@/core/types/schedule';
import type { Student } from '@/types/customer';
import type { ClassItem } from '@/types/classItem';
import type { AcademyEvent } from '@/core/events';
import type { Consultation } from '@/capabilities/consultation/types';
import type { LessonRecord } from '@/core/lessons/types';
import type { MakeupItem } from '@/capabilities/attendance/domain/types';

/** 담당 강사: student.teacherId 또는 배정 반의 class.teacherId */
function isStudentInStaffScope(student: Student, staffId: string, myClassIds: Set<string>): boolean {
  if (student.teacherId === staffId) return true;
  return (student.classIds || []).some((classId) => myClassIds.has(classId));
}

/** 팀장(manager)은 부서 스코프 격리 대상 */
export function isDepartmentScoped(role: string | null | undefined): boolean {
  return role === 'manager';
}

/** 부서 스코프에 따른 아이템 필터링 (최고 관리자 등은 전체 허용) */
export function filterByDepartmentScope<T extends { department_id?: string | null }>(
  items: T[],
  isScopedToDepartment: boolean,
  scopedDepartmentId: string | null | undefined
): T[] {
  if (!isScopedToDepartment) {
    return items;
  }
  if (!scopedDepartmentId) {
    return [];
  }
  return items.filter((item) => item.department_id === scopedDepartmentId);
}

/** 팀장의 타 직원 업무 재배정 가능 여부 검사 */
export function checkCanReassignTask(
  isScopedToDepartment: boolean,
  scopedDepartmentId: string | null | undefined,
  targetStaffDepartmentId?: string | null
): boolean {
  // 최고 관리자(super_admin, director, owner)는 전사 재배정 가능
  if (!isScopedToDepartment) {
    return true;
  }
  // 팀장은 본인 부서 소속인 경우에만 재배정 가능
  if (!scopedDepartmentId || !targetStaffDepartmentId) {
    return false;
  }
  return scopedDepartmentId === targetStaffDepartmentId;
}

export interface StaffScopeState {
  isStaff: boolean;
  staffId: string | null | undefined;
  isScoped: boolean;

  // 부서 단위 스코프 격리 (6단계 역할 체계 중 manager 대응)
  isScopedToDepartment: boolean;
  scopedDepartmentId: string | null;
  filterStaffByScope: <T extends { department_id?: string | null }>(items: T[]) => T[];
  filterRequestsByScope: <T extends { department_id?: string | null }>(items: T[]) => T[];
  canReassignTask: (targetStaffDepartmentId?: string | null) => boolean;

  scopeStudents: (students: Student[]) => Student[];
  scopeClasses: (classes: ClassItem[]) => ClassItem[];
  scopeBookings: (bookings: Booking[], students?: Student[]) => Booking[];
  scopeMembers: (members: Student[], bookings: Booking[]) => Student[];
  scopeMembersForPilates: (members: Student[], bookings: Booking[]) => Student[];
  scopeByStudentIds: <T extends { studentId: string }>(items: T[], students: Student[]) => T[];
  scopeLessons: (lessons: LessonRecord[], students?: Student[]) => LessonRecord[];
  scopeConsultations: (consultations: Consultation[]) => Consultation[];
  scopeMakeupItems: (items: MakeupItem[], students: Student[]) => MakeupItem[];
  scopeRecitalEvents: (events: AcademyEvent[], students: Student[]) => AcademyEvent[];
  getMyStudentIds: (students: Student[]) => Set<string>;
}

export function useStaffScope(): StaffScopeState {
  const { role, isStaff, staffId } = usePermissions();
  const activeUser = useActiveUser();

  const isScoped = isStaff && !!staffId;
  const isScopedToDepartment = isDepartmentScoped(role);
  const scopedDepartmentId = activeUser.department_id ?? activeUser.team_id ?? null;

  const filterStaffByScope = useCallback(
    <T extends { department_id?: string | null }>(items: T[]): T[] => {
      return filterByDepartmentScope(items, isScopedToDepartment, scopedDepartmentId);
    },
    [isScopedToDepartment, scopedDepartmentId]
  );

  const filterRequestsByScope = useCallback(
    <T extends { department_id?: string | null }>(items: T[]): T[] => {
      return filterByDepartmentScope(items, isScopedToDepartment, scopedDepartmentId);
    },
    [isScopedToDepartment, scopedDepartmentId]
  );

  const canReassignTask = useCallback(
    (targetStaffDepartmentId?: string | null): boolean => {
      return checkCanReassignTask(isScopedToDepartment, scopedDepartmentId, targetStaffDepartmentId);
    },
    [isScopedToDepartment, scopedDepartmentId]
  );

  const myClassIds = useMemo(() => {
    if (!isScoped || !staffId) return new Set<string>();
    return new Set<string>(
      StorageService.getClasses()
        .filter((c) => c.teacherId === staffId)
        .map((c) => c.id)
    );
  }, [isScoped, staffId]);

  const scopeStudents = useMemo(
    () =>
      (students: Student[]): Student[] => {
        if (!isScoped || !staffId) return students;
        return students.filter((s) => isStudentInStaffScope(s, staffId, myClassIds));
      },
    [isScoped, staffId, myClassIds]
  );

  const scopeClasses = useMemo(
    () =>
      (classes: ClassItem[]): ClassItem[] => {
        if (!isScoped) return classes;
        return classes.filter((c) => c.teacherId === staffId);
      },
    [isScoped, staffId]
  );

  const scopeBookings = useMemo(
    () =>
      (bookings: Booking[]): Booking[] => {
        if (!isScoped) return bookings;
        return bookings.filter((b) => b.staffId === staffId);
      },
    [isScoped, staffId]
  );

  const getMyStudentIds = useMemo(
    () =>
      (students: Student[]): Set<string> => {
        if (!isScoped || !staffId) return new Set(students.map((s) => s.id));
        return new Set(
          students.filter((s) => isStudentInStaffScope(s, staffId, myClassIds)).map((s) => s.id)
        );
      },
    [isScoped, staffId, myClassIds]
  );

  const scopeMembersForPilates = useMemo(
    () =>
      (members: Student[], bookings: Booking[]): Student[] => {
        if (!isScoped) return members;
        const bookingMemberIds = new Set(
          bookings
            .filter((b) => b.staffId === staffId && b.customerId)
            .map((b) => b.customerId as string)
        );
        return members.filter(
          (m) =>
            m.teacherId === staffId ||
            bookingMemberIds.has(m.id) ||
            (m.classIds || []).some((id) => myClassIds.has(id))
        );
      },
    [isScoped, staffId, myClassIds]
  );

  const scopeByStudentIds = useCallback(
    <T extends { studentId: string }>(items: T[], students: Student[]): T[] => {
      if (!isScoped) return items;
      const ids = getMyStudentIds(students);
      return items.filter((i) => ids.has(i.studentId));
    },
    [isScoped, getMyStudentIds]
  );

  const scopeLessons = useMemo(
    () =>
      (lessons: LessonRecord[], students?: Student[]): LessonRecord[] => {
        if (!isScoped || !staffId) return lessons;
        if (students) {
          const ids = getMyStudentIds(students);
          return lessons.filter((l) => l.teacherId === staffId || ids.has(l.studentId));
        }
        return lessons.filter((l) => l.teacherId === staffId);
      },
    [isScoped, staffId, getMyStudentIds]
  );

  const scopeConsultations = useMemo(
    () =>
      (consultations: Consultation[]): Consultation[] => {
        if (!isScoped) return consultations;
        return consultations.filter((c) => c.counselorId === staffId);
      },
    [isScoped, staffId]
  );

  const scopeMakeupItems = useMemo(
    () =>
      (items: MakeupItem[], students: Student[]): MakeupItem[] => {
        if (!isScoped) return items;
        const ids = getMyStudentIds(students);
        return items.filter((m) => ids.has(m.studentId));
      },
    [isScoped, getMyStudentIds]
  );

  const scopeRecitalEvents = useMemo(
    () =>
      (events: AcademyEvent[], students: Student[]): AcademyEvent[] => {
        if (!isScoped) return events;
        const ids = getMyStudentIds(students);
        return events.filter((ev) => (ev.participantIds || []).some((pid) => ids.has(pid)));
      },
    [isScoped, getMyStudentIds]
  );

  return {
    isStaff,
    staffId,
    isScoped,
    isScopedToDepartment,
    scopedDepartmentId,
    filterStaffByScope,
    filterRequestsByScope,
    canReassignTask,
    scopeStudents,
    scopeClasses,
    scopeBookings,
    scopeMembers: scopeMembersForPilates,
    scopeMembersForPilates,
    scopeByStudentIds,
    scopeLessons,
    scopeConsultations,
    scopeMakeupItems,
    scopeRecitalEvents,
    getMyStudentIds,
  };
}
