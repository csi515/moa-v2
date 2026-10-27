/** 보호자-학생 관계 (부/모/기타) */
export type GuardianRelationship = 'father' | 'mother' | 'other' | 'self';

export const GUARDIAN_RELATIONSHIP_LABELS: Record<GuardianRelationship, string> = {
  father: '아버지',
  mother: '어머니',
  other: '기타',
  self: '본인',
};

/** 학부모 ↔ 학생 연결 (Source of Truth) */
export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** 보호자 + 연결 정보 */
export interface GuardianInfo {
  parentId: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  relationship: GuardianRelationship;
  isPrimary: boolean;
}
