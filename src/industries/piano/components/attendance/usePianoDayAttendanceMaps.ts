import { useMemo } from 'react';
import { useStorageRefresh } from '@/hooks';
import { StorageService } from '@/services/storage';
import {
  buildDayAttendanceRecordMap,
  buildPinCheckInIdSet,
} from './pianoAttendanceHelpers';

/** 일자별 DAY_ATTENDANCE 기록·PIN 체크인 맵 (출결·홈·강사 홈 공용) */
export function usePianoDayAttendanceMaps(dateIso: string) {
  const refreshKey = useStorageRefresh('attendance');

  const dayRecordMap = useMemo(() => {
    void refreshKey;
    return buildDayAttendanceRecordMap(dateIso, StorageService.getAttendance());
  }, [dateIso, refreshKey]);

  const pinCheckInIds = useMemo(() => {
    void refreshKey;
    return buildPinCheckInIdSet(dateIso, StorageService.getAttendanceSessions());
  }, [dateIso, refreshKey]);

  return { dayRecordMap, pinCheckInIds, refreshKey };
}
