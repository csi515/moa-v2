import type { GuardianRelationship, ParentStudentLink } from '@/core/parent/types';

type DbRelationship = GuardianRelationship;

export function linkToRow(link: ParentStudentLink, organizationId: string) {
  return {
    organization_id: organizationId,
    parent_customer_id: link.parentId,
    student_customer_id: link.studentId,
    relationship: link.relationship as DbRelationship,
    is_primary: link.isPrimary,
    created_at: link.createdAt || new Date().toISOString(),
    updated_at: link.updatedAt || new Date().toISOString(),
  };
}

export function rowToLink(row: {
  parent_customer_id: string;
  student_customer_id: string;
  relationship: DbRelationship | string;
  is_primary: boolean;
  created_at: string;
  updated_at?: string;
}): ParentStudentLink {
  const rel = row.relationship as GuardianRelationship;
  return {
    id: `${row.parent_customer_id}:${row.student_customer_id}`,
    parentId: row.parent_customer_id,
    studentId: row.student_customer_id,
    relationship: rel === 'father' || rel === 'mother' ? rel : 'other',
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
