import type { Parent, Student } from '@/types';
import type { GuardianInfo, GuardianRelationship, ParentStudentLink } from './types';
import { GUARDIAN_RELATIONSHIP_LABELS } from './types';
import { StorageService } from '@/services/storage';

export { GUARDIAN_RELATIONSHIP_LABELS };

/** 학생의 모든 보호자 연결 */
export function getGuardiansForStudent(studentId: string): GuardianInfo[] {
  const links = StorageService.getParentStudentLinks().filter((l) => l.studentId === studentId);
  const parents = StorageService.getParents();

  return links
    .map((link) => {
      const parent = parents.find((p) => p.id === link.parentId);
      if (!parent) return null;
      return {
        parentId: parent.id,
        parentName: parent.name,
        parentPhone: parent.phone,
        ...(parent.email ? { parentEmail: parent.email } : {}),
        relationship: link.relationship,
        isPrimary: link.isPrimary,
      } satisfies GuardianInfo;
    })
    .filter((g): g is GuardianInfo => g !== null)
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

/** 주 보호자 (isPrimary → 첫 번째) */
export function getPrimaryGuardian(studentId: string): GuardianInfo | null {
  const guardians = getGuardiansForStudent(studentId);
  return guardians.find((g) => g.isPrimary) || guardians[0] || null;
}

/** UI 표시용 — links에서 primary 보호자 파생 */
export function deriveStudentGuardianFields(student: Student): Student {
  const primary = getPrimaryGuardian(student.id);
  if (!primary) return student;
  return {
    ...student,
    parentId: primary.parentId,
    parentName: primary.parentName,
    parentPhone: primary.parentPhone,
  };
}

export function studentMatchesGuardianQuery(studentId: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return getGuardiansForStudent(studentId).some(
    (g) => g.parentName.toLowerCase().includes(q) || g.parentPhone.includes(q)
  );
}

/** 주 보호자 연락처 (admin UI 표시용) */
export function getGuardianContactDisplay(studentId: string): {
  parentId?: string;
  parentName: string;
  parentPhone: string;
} {
  const primary = getPrimaryGuardian(studentId);
  return {
    parentId: primary?.parentId,
    parentName: primary?.parentName || '',
    parentPhone: primary?.parentPhone || '',
  };
}

/** 상담/교재 등 studentId 기준 보호자 이름 */
export function resolveGuardianNameForStudent(studentId: string, fallback = ''): string {
  return getPrimaryGuardian(studentId)?.parentName || fallback || '학부모';
}

/** 학생 목록 enrich (기존 UI 호환) */
export function enrichStudentsWithGuardians(students: Student[]): Student[] {
  return students.map(deriveStudentGuardianFields);
}

/** 학부모 검색 (이름·전화·이메일·자녀명) */
export function searchParents(query: string): Parent[] {
  const q = query.trim().toLowerCase();
  if (!q) return StorageService.getParents();

  const students = StorageService.getStudents();
  return StorageService.getParents().filter((p) => {
    const childNames = p.studentIds
      .map((id) => students.find((s) => s.id === id)?.name || '')
      .join(' ');
    return (
      p.name.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      (p.email || '').toLowerCase().includes(q) ||
      childNames.toLowerCase().includes(q)
    );
  });
}

/** 자녀 이름 목록 (학부모 카드용) */
export function getParentChildNames(parent: Parent): string[] {
  const students = StorageService.getStudents();
  return parent.studentIds
    .map((id) => students.find((s) => s.id === id)?.name)
    .filter((n): n is string => Boolean(n));
}

export function formatGuardianRelationship(rel: GuardianRelationship): string {
  return GUARDIAN_RELATIONSHIP_LABELS[rel];
}

export function formatGuardianSummary(studentId: string): string {
  const guardians = getGuardiansForStudent(studentId);
  if (guardians.length === 0) return '-';
  return guardians
    .map((g) => `${g.parentName}(${formatGuardianRelationship(g.relationship)})`)
    .join(', ');
}

/** links 기반 Parent.studentIds 재구성 */
export function rebuildParentStudentIdsFromLinks(): void {
  StorageService.rebuildParentStudentIdsFromLinks();
}
