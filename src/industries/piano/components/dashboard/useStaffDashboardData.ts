import { useMemo } from 'react';
import { useStaffScope, useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import { usePianoExpectedDay } from '../attendance/usePianoExpectedDay';
import {
  resolveDayStatus,
  todayIsoLocal,
} from '../attendance/pianoAttendanceHelpers';

/** 강사 홈 — 담당 범위 오늘 예정·출결·보강·연습 집계 */
export function useStaffDashboardData() {
  const refreshKey = useStorageRefresh();
  const { scopeMakeupItems, scopeByStudentIds } = useStaffScope();
  const today = todayIsoLocal();
  const { students: activeStudents, expected, dayRecordMap, pinCheckInIds } =
    usePianoExpectedDay(today);

  const allStudents = useMemo(() => {
    void refreshKey;
    return StorageService.getStudents();
  }, [refreshKey]);

  const pendingMakeups = useMemo(
    () =>
      scopeMakeupItems(StorageService.getMakeupItems(), allStudents).filter(
        (m) => m.status === 'pending'
      ).length,
    [allStudents, scopeMakeupItems, refreshKey]
  );

  const pendingPracticeCount = useMemo(
    () =>
      scopeByStudentIds(StorageService.getPracticeRecords(), allStudents).filter(
        (record) => record.source === 'parent' && !record.staffReviewed
      ).length,
    [allStudents, scopeByStudentIds, refreshKey]
  );

  const uncheckedCount = useMemo(
    () =>
      expected.filter((row) => {
        const status = resolveDayStatus(
          dayRecordMap.get(row.student.id),
          pinCheckInIds.has(row.student.id)
        );
        return status === 'unchecked';
      }).length,
    [expected, dayRecordMap, pinCheckInIds]
  );

  return {
    today,
    activeStudents,
    expected,
    uncheckedCount,
    pendingMakeups,
    pendingPracticeCount,
    dayRecordMap,
    pinCheckInIds,
  };
}
