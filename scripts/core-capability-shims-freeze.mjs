/**
 * Core Compatibility Shim Frozen Allowlist
 *
 * Core 디렉터리(src/core/)에서 @/capabilities/를 참조하는 re-export Shim 파일들은
 * 하위 호환성을 위해 아래 목록에 한해 영구 동결(Frozen) 상태로만 허용된다.
 *
 * AGENTS.md §5.5 규칙:
 * Core 디렉터리 내부에서는 @/capabilities를 참조하거나 re-export하는 어떠한 신규 파일도 생성할 수 없다.
 */

export const FROZEN_CORE_CAPABILITY_SHIMS = new Set([
  'src/core/attendance/attendanceClassKey.ts',
  'src/core/attendance/attendanceIndustryCopy.ts',
  'src/core/attendance/attendanceNotifyCopy.ts',
  'src/core/attendance/dayAttendance.ts',
  'src/core/attendance/features.ts',
  'src/core/attendance/index.ts',
  'src/core/attendance/services/attendanceService.ts',
  'src/core/attendance/types.ts',
  'src/core/finance/billingIncomeLink.ts',
  'src/core/finance/index.ts',
  'src/core/finance/paymentMethodLabels.ts',
  'src/core/finance/teacherPayroll/index.ts',
  'src/core/finance/types.ts',
  'src/core/loyalty/index.ts',
  'src/core/resources/index.ts',
  'src/core/schedules/classAttendanceLedger.ts',
  'src/core/transport/index.ts',
]);

export function isFrozenCoreCapabilityShim(relPath) {
  return FROZEN_CORE_CAPABILITY_SHIMS.has(relPath);
}
