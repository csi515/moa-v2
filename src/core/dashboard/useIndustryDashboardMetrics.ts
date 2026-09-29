import { useMemo } from 'react';
import { useStorageRefresh, useStaffScope } from '@/hooks';
import { StorageService } from '@/services/storage';
import type { ClassItem, Student, Teacher } from '@/types';

export interface IndustryDashboardMetrics {
  today: string;
  students: Student[];
  checkedInToday: number;
  teachers: Teacher[];
  classes: ClassItem[];
}

/** 업종 공통 대시보드 지표 (원생·출입·강사·반) */
export function useIndustryDashboardMetrics(): IndustryDashboardMetrics {
  const refreshKey = useStorageRefresh();
  const { scopeStudents } = useStaffScope();
  const today = new Date().toISOString().slice(0, 10);

  const students = useMemo(
    () => scopeStudents(StorageService.getStudents()).filter((student) => student.status === 'active'),
    [scopeStudents, refreshKey]
  );

  const checkedInToday = useMemo(() => {
    const sessions = StorageService.getAttendanceSessions().filter(
      (session) => session.sessionDate === today
    );
    return new Set(sessions.filter((session) => session.checkInAt).map((session) => session.customerId))
      .size;
  }, [refreshKey, today]);

  const teachers = useMemo(
    () => StorageService.getTeachers().filter((teacher) => teacher.status === 'active'),
    [refreshKey]
  );

  const classes = useMemo(() => StorageService.getClasses(), [refreshKey]);

  return { today, students, checkedInToday, teachers, classes };
}
