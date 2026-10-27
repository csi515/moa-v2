import type { GuardianRelationship } from '@/core/parent/types';
import { getCoreClient } from '@/lib/supabase';

export const DEFAULT_SHARED_CHILD_FIELDS = [
  'display_name',
  'birth_date',
  'gender',
  'school',
  'grade',
] as const;

export type SharedChildField = (typeof DEFAULT_SHARED_CHILD_FIELDS)[number];

export const SHARED_CHILD_FIELD_LABELS: Record<SharedChildField, string> = {
  display_name: '이름',
  birth_date: '생년월일',
  gender: '성별',
  school: '학교',
  grade: '학년',
};

export function sharedFieldPreview(
  field: SharedChildField,
  student: {
    displayName: string;
    birthDate?: string | null;
    gender?: string | null;
    school?: string | null;
    grade?: string | null;
  }
): string {
  if (field === 'display_name') return `자녀 이름: ${student.displayName}`;
  if (field === 'birth_date') return student.birthDate ? `생년월일: ${student.birthDate}` : '생년월일 미입력';
  if (field === 'gender') {
    if (student.gender === 'M') return '성별: 남';
    if (student.gender === 'F') return '성별: 여';
    return '성별 미입력';
  }
  if (field === 'school') return student.school ? `학교: ${student.school}` : '학교 미입력';
  return student.grade ? `학년: ${student.grade}` : '학년 미입력';
}

export interface ChildProfileInput {
  displayName: string;
  birthDate?: string | null;
  relationship?: GuardianRelationship;
  gender?: string | null;
  school?: string | null;
  grade?: string | null;
  isPrimary?: boolean;
}

export interface RegisterParentChildResult {
  status: 'created' | 'existing';
  studentId: string;
  displayName: string;
  birthDate: string | null;
  gender: string | null;
  school: string | null;
  grade: string | null;
}

/** 학부모가 자녀 기본정보를 등록 (학원 연결 전) */
export async function registerParentChild(params: ChildProfileInput): Promise<RegisterParentChildResult> {
  const { data, error } = await getCoreClient().rpc('parent_register_child' as never, {
    p_display_name: params.displayName.trim(),
    p_birth_date: params.birthDate || null,
    p_relationship: params.relationship ?? 'other',
    p_is_primary: params.isPrimary ?? true,
    p_gender: params.gender || null,
    p_school: params.school || null,
    p_grade: params.grade || null,
  } as never);
  if (error) throw error;

  const row = (data ?? {}) as {
    status?: 'created' | 'existing';
    student_id?: string;
    display_name?: string;
    birth_date?: string | null;
    gender?: string | null;
    school?: string | null;
    grade?: string | null;
  };

  return {
    status: row.status === 'existing' ? 'existing' : 'created',
    studentId: String(row.student_id ?? ''),
    displayName: String(row.display_name ?? params.displayName),
    birthDate: row.birth_date ? String(row.birth_date) : params.birthDate ?? null,
    gender: row.gender ? String(row.gender) : null,
    school: row.school ? String(row.school) : null,
    grade: row.grade ? String(row.grade) : null,
  };
}

export async function updateParentChild(
  studentId: string,
  params: ChildProfileInput
): Promise<void> {
  const { error } = await getCoreClient().rpc('parent_update_child' as never, {
    p_student_id: studentId,
    p_display_name: params.displayName.trim(),
    p_birth_date: params.birthDate || null,
    p_relationship: params.relationship ?? null,
    p_gender: params.gender || null,
    p_school: params.school || null,
    p_grade: params.grade || null,
  } as never);
  if (error) throw error;
}
