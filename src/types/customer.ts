import type { PickupAddress } from '@/capabilities/transport/types';
import type { StudentBillingMode } from '@/core/students/billingMode';

export type StudentStatus = 'active' | 'leave' | 'withdrawn';

/**
 * @deprecated 전역 union 아님. 저장은 string. 값 검증은 Industry
 * (`PianoStudentLevel`, `DaycareAgeClass`, `GymClassLevel`).
 */
export type StudentLevel = string;

export interface Student {
  id: string;
  studentNumber: string;
  name: string;
  gender: 'M' | 'F';
  birthDate: string;
  school: string;
  grade: string;
  /** @deprecated parent_student_links에서 파생 — UI는 getPrimaryGuardian 사용 */
  parentId?: string;
  /** @deprecated */
  parentName?: string;
  /** @deprecated */
  parentPhone?: string;
  phone?: string;
  emergencyContact?: string;
  address?: string;
  usesShuttleService?: boolean;
  pickupAddresses?: PickupAddress[];
  joinDate: string;
  leaveDate?: string;
  status: StudentStatus;
  teacherId: string;
  teacherName: string;
  classIds: string[];
  /** Industry 선택지 문자열. union 아님 */
  level: string;
  billingMode?: StudentBillingMode;
  tuitionFee: number;
  paymentDay: number;
  specialNotes?: string;
  memo?: string;
  avatarColor?: string;
  checkInPinSet?: boolean;
  userId?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  studentIds: string[];
  notes?: string;
  createdAt: string;
}
