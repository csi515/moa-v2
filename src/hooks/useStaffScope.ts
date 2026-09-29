import { useMemo } from 'react';
import { usePermissions } from '@/core/auth/usePermissions';
import { StorageService } from '@/services/storage';
import type { Booking } from '@/core/types/schedule';
import type {
  AcademyEvent,
  ClassItem,
  Consultation,
  LessonRecord,
  MakeupItem,
  Student,
} from '@/types';

/** 담당 강사: student.teacherId 또는 배정 반의 class.teacherId */
function isStudentInStaffScope(student: Student, staffId: string, myClassIds: Set<string>): boolean {
  if (student.teacherId === staffId) return true;
  return (student.classIds || []).some((classId) => myClassIds.has(classId));
}

export function useStaffScope() {
  const { isStaff, staffId } = usePermissions();

  const isScoped = isStaff && !!staffId;

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

  const scopeByStudentIds = useMemo(
    () =>
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
    scopeStudents,
    scopeClasses,
    scopeBookings,
    scopeMembersForPilates,
    scopeByStudentIds,
    scopeLessons,
    scopeConsultations,
    scopeMakeupItems,
    scopeRecitalEvents,
    getMyStudentIds,
  };
}
