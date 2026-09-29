import type { GuardianRelationship } from '../types';

/** 학원 등록 상태 */
export type EnrollmentStatus = 'active' | 'leave' | 'withdrawn' | 'alumni';

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  active: '재원',
  leave: '휴원',
  withdrawn: '연결 종료',
  alumni: '졸업',
};

export const ACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = ['active', 'leave'];
export const INACTIVE_ENROLLMENT_STATUSES: EnrollmentStatus[] = ['withdrawn', 'alumni'];

export function isReadOnlyEnrollment(status: EnrollmentStatus): boolean {
  return INACTIVE_ENROLLMENT_STATUSES.includes(status);
}

export function getReadOnlyEnrollmentMessage(status: EnrollmentStatus): string {
  if (status === 'alumni') {
    return '졸업 처리된 기록입니다. 조회만 가능하며 새 요청은 보낼 수 없습니다.';
  }
  if (status === 'withdrawn') {
    return '앱 연결이 종료된 기록입니다. 조회만 가능합니다. 학원 재원·퇴원 여부는 학원에 문의해 주세요.';
  }
  return '';
}

/** 전역 학부모 프로필 */
export interface GlobalParent {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/** 학원별 등록 정보 */
export interface StudentEnrollment {
  enrollmentId: string;
  organizationId: string;
  organizationName: string;
  industryType: string;
  customerId: string;
  status: EnrollmentStatus;
  enrolledAt: string | null;
  leftAt: string | null;
  checkInPinSet?: boolean;
}

/** 전역 자녀 + 등록 목록 */
export interface GlobalStudent {
  studentId: string;
  displayName: string;
  birthDate: string | null;
  gender: string | null;
  school: string | null;
  grade: string | null;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  enrollments: StudentEnrollment[];
}

/** 등록 요청 상태 */
export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const ENROLLMENT_REQUEST_STATUS_LABELS: Record<EnrollmentRequestStatus, string> = {
  pending: '연결 요청 중',
  approved: '연결 완료',
  rejected: '연결 거절',
  cancelled: '요청 취소',
};

/** 등록 요청 */
export interface EnrollmentRequestInfo {
  id: string;
  studentId: string;
  studentName: string;
  organizationId: string;
  organizationName: string;
  industryType: string;
  status: EnrollmentRequestStatus;
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

/** get_my_parent_portal_tree RPC 응답 */
export interface ParentPortalTree {
  parent: GlobalParent | null;
  children: GlobalStudent[];
  enrollmentRequests?: EnrollmentRequestInfo[];
}
