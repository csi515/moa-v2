/** Attendance 공식 public API. 외부는 `@/capabilities/attendance`만 사용한다. */
export { attendanceCapability } from './manifest';

export { AttendanceManagementView } from './ui/AttendanceManagementView';
export { PinCheckInKioskView } from './ui/PinCheckInKioskView';
export { AttendanceKioskPage } from './ui/AttendanceKioskPage';
export { CustomerPinPanel } from './ui/CustomerPinPanel';
export { AttendanceFeatureToggle } from './ui/AttendanceFeatureToggle';
export { OnboardingAttendanceChoice } from './ui/OnboardingAttendanceChoice';
export {
  PIN_ATTENDANCE_DIRECTOR_COPY,
  PIN_ATTENDANCE_PARENT_COPY,
} from './domain/attendanceNotifyCopy';
export * from './domain/types';
export * from './domain/features';
export * from './domain/dayAttendance';
export {
  attendanceClassKey,
  isDayAttendanceClassId,
  isAttendanceServiceUuid,
} from './domain/attendanceClassKey';
export { CLASS_ATTENDANCE_LEDGER } from './domain/classAttendanceLedger';
export * from './application/pinCheckInSideEffects';
export * from './application/attendanceService';
export * from './application/pinService';
export {
  runPinAttendanceValidation,
  PIN_ATTENDANCE_SCENARIO_CHECKLIST,
} from './domain/pinAttendanceValidation';
export * from './domain/unifiedAttendancePipeline';
export * from './notifications';
