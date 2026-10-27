import { useMemo } from 'react';
import { useStaffScope } from '@/hooks';
import { StorageService } from '@/services/storage';
import { StudentService } from '@/core/students';
import { usePianoDayAttendanceMaps } from './usePianoDayAttendanceMaps';
import {
  formatExpectedScheduleLabel,
  getExpectedStudentsOnDate,
  resolveDayStatus,
  type DayStatus,
  type ExpectedStudentOnDate,
} from './pianoAttendanceHelpers';
import type { AttendanceRecord } from '@/types';

export type ExpectedDayStatusRow = {
  student: ExpectedStudentOnDate['student'];
  classes: ExpectedStudentOnDate['classes'];
  earliestStart: string;
  record: AttendanceRecord | undefined;
  status: DayStatus;
  scheduleLabel: string;
};

/**
 * 일자별 「예정 학생 + DAY_ATTENDANCE/PIN 맵」 단일 조회.
 * 출결 화면·원장/강사 홈에서 동일 스토리지 경로를 재사용한다.
 */
export function usePianoExpectedDay(dateIso: string) {
  const { scopeStudents, scopeClasses } = useStaffScope();
  const { dayRecordMap, pinCheckInIds, refreshKey } = usePianoDayAttendanceMaps(dateIso);

  const students = useMemo(
    () => scopeStudents(StudentService.getActiveStudents()),
    [scopeStudents, refreshKey]
  );

  const classes = useMemo(
    () => scopeClasses(StorageService.getClasses()),
    [scopeClasses, refreshKey]
  );

  const expected = useMemo(
    () =>
      getExpectedStudentsOnDate(dateIso, students, classes, {
        makeups: StorageService.getMakeupItems(),
      }),
    [dateIso, students, classes, refreshKey]
  );

  return {
    students,
    classes,
    expected,
    dayRecordMap,
    pinCheckInIds,
    refreshKey,
  };
}

export type PianoExpectedDay = ReturnType<typeof usePianoExpectedDay>;

/** 예정 행에 당일 출결 상태·스케줄 라벨을 붙인다 (필터·정렬은 호출측) */
export function mapExpectedWithDayStatus(
  expected: ExpectedStudentOnDate[],
  dayRecordMap: Map<string, AttendanceRecord>,
  pinCheckInIds: Set<string>
): ExpectedDayStatusRow[] {
  return expected.map((row) => {
    const record = dayRecordMap.get(row.student.id);
    return {
      student: row.student,
      classes: row.classes,
      earliestStart: row.earliestStart,
      record,
      status: resolveDayStatus(record, pinCheckInIds.has(row.student.id)),
      scheduleLabel: formatExpectedScheduleLabel(row.classes),
    };
  });
}
