import type { GuardianRelationship } from '@/core/parent/types';
import type { PickupAddress } from '@/capabilities/transport/types';
import type { StudentBillingMode } from '@/core/students/billingMode';
import type { StudentStatus } from '@/types';

export interface GuardianFormEntry {
  key: string;
  mode: 'existing' | 'new';
  existingParentId: string;
  parentSearch: string;
  name: string;
  phone: string;
  email: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  invite: boolean;
}

export interface StudentFormData {
  name: string;
  gender: '' | 'M' | 'F';
  birthDate: string;
  phone: string;
  school: string;
  grade: string;
  joinDate: string;
  leaveDate: string;
  status: StudentStatus;
  teacherId: string;
  classIds: string[];
  level: string;
  billingMode: StudentBillingMode;
  tuitionFee: number;
  paymentDay: number;
  specialNotes: string;
  memo: string;
  address: string;
  usesShuttleService: boolean;
  pickupAddresses: PickupAddress[];
  checkInPin: string;
  autoGeneratePin: boolean;
}

/** @deprecated 신규는 getStudentLevelOptions(industry) */
export const LEVEL_OPTIONS: string[] = [];

export const RELATIONSHIP_OPTIONS: GuardianRelationship[] = ['father', 'mother', 'other'];

export function newGuardianEntry(primary = false): GuardianFormEntry {
  return {
    key: crypto.randomUUID(),
    mode: 'new',
    existingParentId: '',
    parentSearch: '',
    name: '',
    phone: '',
    email: '',
    relationship: 'mother',
    isPrimary: primary,
    invite: false,
  };
}

/** 특이사항·메모 표시용 통합 (저장 필드는 specialNotes 우선, memo는 호환용) */
export function combineStudentNotes(specialNotes?: string | null, memo?: string | null): string {
  const a = (specialNotes || '').trim();
  const b = (memo || '').trim();
  if (a && b && a !== b) return `${a}\n\n${b}`;
  return a || b;
}
