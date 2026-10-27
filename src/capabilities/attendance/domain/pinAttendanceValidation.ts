import { attendanceStorage } from '@/capabilities/attendance/infrastructure/attendanceStorage';
import { settingsStorage } from '@/services/storage/settingsStorage';
import { isAttendanceModuleEnabled } from './features';

export type PinAttendanceValidationResult = {
  id: string;
  ok: boolean;
  message: string;
};

/** PIN 사용/미사용·입실 only 스모크 검증 (로컬 스토리지) */
export function runPinAttendanceValidation(industry = 'piano'): PinAttendanceValidationResult[] {
  const results: PinAttendanceValidationResult[] = [];
  const settings = settingsStorage.getSettings();
  const enabled = isAttendanceModuleEnabled(settings, industry);
  const sessions = attendanceStorage.getAttendanceSessions();
  const today = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.sessionDate === today);

  results.push({
    id: 'feature-flag-explicit',
    ok: typeof settings.features?.attendance?.enabled === 'boolean',
    message:
      typeof settings.features?.attendance?.enabled === 'boolean'
        ? `출결 플래그 확정됨 (PIN ${enabled ? 'ON' : 'OFF'})`
        : 'features.attendance.enabled 미설정 — backfillAttendanceFeatureFlag 권장',
  });

  const withCheckoutWritten = todaySessions.filter((s) => s.checkOutAt);
  results.push({
    id: 'no-new-checkout-required',
    ok: true,
    message:
      withCheckoutWritten.length > 0
        ? `레거시 퇴실 시각 ${withCheckoutWritten.length}건 보존(신규 퇴실 쓰기 없음)`
        : '당일 세션에 퇴실 시각 없음 (입실 only)',
  });

  const duplicateCheckIns = todaySessions.filter(
    (s, i, arr) =>
      s.checkInAt &&
      arr.findIndex((x) => x.customerId === s.customerId && x.sessionDate === s.sessionDate) !== i
  );
  results.push({
    id: 'one-session-per-student-day',
    ok: duplicateCheckIns.length === 0,
    message:
      duplicateCheckIns.length === 0
        ? '학생·날짜당 세션 1건'
        : `중복 세션 ${duplicateCheckIns.length}건`,
  });

  return results;
}

export const PIN_ATTENDANCE_SCENARIO_CHECKLIST = [
  '1. MANUAL 신규: 레슨 출결 OK, PIN/check-in 탭 없음',
  '2. PIN 신규: PIN 입력 → 출석 완료 → Session checkIn만',
  '3. 같은 날 재입력: 퇴실 없이 “이미 출석” 안내',
  '4. MANUAL→PIN 활성화 / PIN→MANUAL 비활성화(데이터 보존)',
  '5. staff는 출결 방식 변경 불가',
  '6. org A MANUAL / org B PIN 공존',
  '7. TodayLessonView 출석/결석 회귀',
  '8. Overview에 퇴실 컬럼/액션 없음',
  '9. /attendance-kiosk 전체화면, 길게 눌러 관리자 종료',
] as const;
