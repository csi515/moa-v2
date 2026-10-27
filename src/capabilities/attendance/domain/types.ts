/** 출결 체크 방식 (PIN 외 QR·NFC·키오스크 확장) */
export type CheckInMethod = 'pin' | 'qr' | 'nfc' | 'kiosk' | 'manual';

/**
 * Attendance 체크인 행 (core.attendance_sessions).
 * Session(방문 사실)이나 수업 출석(piano.attendance)이 아니다.
 * 출석 여부는 checkInAt. 별도 status를 schedules/reservations에 미러하지 않는다.
 */
export interface AttendanceSession {
  id: string;
  customerId: string;
  customerName: string;
  sessionDate: string; // YYYY-MM-DD
  checkInAt?: string;
  /** @deprecated 퇴실 미사용 — 기존 데이터 보존용 */
  checkOutAt?: string;
  checkInMethod?: CheckInMethod;
  /** @deprecated 퇴실 미사용 */
  checkOutMethod?: CheckInMethod;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Attendance 체크인. 이름 호환용 — 방문 Session이 아님 */
export type AttendanceCheckIn = AttendanceSession;

/** PIN 입력 결과 (출석만) */
export type PinCheckResult =
  | { success: true; action: 'check_in'; customerId: string; customerName: string; at: string }
  | { success: false; error: PinCheckError; customerName?: string };

export type PinCheckError =
  | 'invalid_pin'
  | 'already_checked_in'
  /** @deprecated 퇴실 제거 — already_checked_in 사용 */
  | 'already_checked_out'
  | 'module_disabled'
  | 'pin_already_used'
  | 'forbidden'
  | 'customer_not_found'
  | 'invalid_pin_format';

/** 조직 출결 모듈 설정 */
export interface AttendanceModuleSettings {
  enabled: boolean;
}

/** 수업 출석 상태. PIN 체크인 AttendanceSession과 다른 엔티티 */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'early_leave' | 'make_up';

export interface AttendanceRecord {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  status: AttendanceStatus;
  absentReason?: string;
  makeUpRequired?: boolean;
  makeUpDate?: string;
  makeUpStartTime?: string;
  makeUpEndTime?: string;
  makeUpRoom?: string;
  makeUpTeacherId?: string;
  makeUpTeacherName?: string;
  memo?: string;
  createdBy: string;
  createdAt?: string;
  sessionPassId?: string;
}

export type MakeupStatus = 'pending' | 'scheduled' | 'completed';

export interface MakeupItem {
  attendanceId: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  classId: string;
  className: string;
  originalDate: string;
  absentReason?: string;
  makeUpDate?: string;
  makeUpStartTime?: string;
  makeUpEndTime?: string;
  makeUpRoom?: string;
  makeUpTeacherId?: string;
  makeUpTeacherName?: string;
  status: MakeupStatus;
  memo?: string;
}

export interface MakeupScheduleInput {
  date: string;
  startTime?: string;
  endTime?: string;
  room?: string;
  teacherId?: string;
  teacherName?: string;
}
