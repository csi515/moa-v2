const OPEN_MEMBERSHIP_JOINS_KEY = 'moa_open_membership_joins';
const OPEN_GUARDIAN_ENROLLMENTS_KEY = 'moa_open_guardian_enrollments';
const OPEN_CONSULTATION_INQUIRIES_KEY = 'moa_open_consultation_inquiries';
const OPEN_CONSULTATION_RESERVATIONS_KEY = 'moa_open_consultation_reservations';
const OPEN_PENDING_PRACTICE_KEY = 'moa_open_pending_practice';
const OPEN_UNCHECKED_LESSONS_KEY = 'moa_open_unchecked_lessons';

/** 홈 알림에서 학생 화면의 수강 가입 목록으로 스크롤 */
export function requestOpenMembershipJoins(): void {
  sessionStorage.setItem(OPEN_MEMBERSHIP_JOINS_KEY, '1');
}

export function consumeOpenMembershipJoins(): boolean {
  if (sessionStorage.getItem(OPEN_MEMBERSHIP_JOINS_KEY) !== '1') return false;
  sessionStorage.removeItem(OPEN_MEMBERSHIP_JOINS_KEY);
  return true;
}

/** 홈 알림에서 학부모 등록 목록으로 스크롤 */
export function requestOpenGuardianEnrollments(): void {
  sessionStorage.setItem(OPEN_GUARDIAN_ENROLLMENTS_KEY, '1');
}

export function consumeOpenGuardianEnrollments(): boolean {
  if (sessionStorage.getItem(OPEN_GUARDIAN_ENROLLMENTS_KEY) !== '1') return false;
  sessionStorage.removeItem(OPEN_GUARDIAN_ENROLLMENTS_KEY);
  return true;
}

/** 홈 알림에서 상담 허브의 문의 세그먼트로 이동 */
export function requestOpenConsultationInquiries(): void {
  sessionStorage.setItem(OPEN_CONSULTATION_INQUIRIES_KEY, '1');
}

export function consumeOpenConsultationInquiries(): boolean {
  if (sessionStorage.getItem(OPEN_CONSULTATION_INQUIRIES_KEY) !== '1') return false;
  sessionStorage.removeItem(OPEN_CONSULTATION_INQUIRIES_KEY);
  return true;
}

/** 홈 알림에서 상담 허브의 예약 세그먼트로 이동 */
export function requestOpenConsultationReservations(): void {
  sessionStorage.setItem(OPEN_CONSULTATION_RESERVATIONS_KEY, '1');
}

export function consumeOpenConsultationReservations(): boolean {
  if (sessionStorage.getItem(OPEN_CONSULTATION_RESERVATIONS_KEY) !== '1') return false;
  sessionStorage.removeItem(OPEN_CONSULTATION_RESERVATIONS_KEY);
  return true;
}

/** 강사 홈에서 연습 기록의 학부모 확인 대기로 이동 */
export function requestOpenPendingPractice(): void {
  sessionStorage.setItem(OPEN_PENDING_PRACTICE_KEY, '1');
}

export function consumeOpenPendingPractice(): boolean {
  if (sessionStorage.getItem(OPEN_PENDING_PRACTICE_KEY) !== '1') return false;
  sessionStorage.removeItem(OPEN_PENDING_PRACTICE_KEY);
  return true;
}

/** 원장 홈에서 오늘 출결 미체크 원생만 먼저 보기 */
export function requestOpenUncheckedLessons(): void {
  sessionStorage.setItem(OPEN_UNCHECKED_LESSONS_KEY, '1');
}

export function consumeOpenUncheckedLessons(): boolean {
  if (sessionStorage.getItem(OPEN_UNCHECKED_LESSONS_KEY) !== '1') return false;
  sessionStorage.removeItem(OPEN_UNCHECKED_LESSONS_KEY);
  return true;
}

const PLACE_STUDENT_ON_TIMETABLE_KEY = 'moa_place_student_on_timetable';

/** 신규 등록 후 시간표에서 해당 학생 배치 시작 (반 자동 배정 없음) */
export function requestPlaceStudentOnTimetable(studentId: string): void {
  if (!studentId) return;
  sessionStorage.setItem(PLACE_STUDENT_ON_TIMETABLE_KEY, studentId);
}

/** 아직 소비하지 않고 조회 (학생 목록 로드 대기용) */
export function peekPlaceStudentOnTimetable(): string | null {
  return sessionStorage.getItem(PLACE_STUDENT_ON_TIMETABLE_KEY);
}

export function consumePlaceStudentOnTimetable(): string | null {
  const id = sessionStorage.getItem(PLACE_STUDENT_ON_TIMETABLE_KEY);
  if (!id) return null;
  sessionStorage.removeItem(PLACE_STUDENT_ON_TIMETABLE_KEY);
  return id;
}
