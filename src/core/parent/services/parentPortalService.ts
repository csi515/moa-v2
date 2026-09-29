import { getCoreClient } from '@/lib/supabase';
import type {
  ParentPortalTree,
  GlobalParent,
  GlobalStudent,
  StudentEnrollment,
  EnrollmentStatus,
  EnrollmentRequestInfo,
  EnrollmentRequestStatus,
} from '../types/globalParent';
import type { GuardianRelationship } from '../types';

function parseEnrollment(raw: Record<string, unknown>): StudentEnrollment {
  return {
    enrollmentId: String(raw.enrollment_id),
    organizationId: String(raw.organization_id),
    organizationName: String(raw.organization_name ?? ''),
    industryType: String(raw.industry_type ?? 'piano'),
    customerId: String(raw.customer_id),
    status: (raw.status as EnrollmentStatus) ?? 'active',
    enrolledAt: raw.enrolled_at ? String(raw.enrolled_at) : null,
    leftAt: raw.left_at ? String(raw.left_at) : null,
    checkInPinSet: Boolean(raw.check_in_pin_set),
  };
}

function parseChild(raw: Record<string, unknown>): GlobalStudent {
  const enrollments = Array.isArray(raw.enrollments)
    ? (raw.enrollments as Record<string, unknown>[]).map(parseEnrollment)
    : [];

  return {
    studentId: String(raw.student_id),
    displayName: String(raw.display_name ?? ''),
    birthDate: raw.birth_date ? String(raw.birth_date) : null,
    gender: raw.gender ? String(raw.gender) : null,
    school: raw.school ? String(raw.school) : null,
    grade: raw.grade ? String(raw.grade) : null,
    relationship: (raw.relationship as GuardianRelationship) ?? 'other',
    isPrimary: Boolean(raw.is_primary),
    enrollments,
  };
}

function parseEnrollmentRequest(raw: Record<string, unknown>): EnrollmentRequestInfo {
  return {
    id: String(raw.id),
    studentId: String(raw.student_id ?? ''),
    studentName: String(raw.student_name ?? ''),
    organizationId: String(raw.organization_id ?? ''),
    organizationName: String(raw.organization_name ?? ''),
    industryType: String(raw.industry_type ?? ''),
    status: (raw.status as EnrollmentRequestStatus) ?? 'pending',
    requestedAt: String(raw.requested_at ?? ''),
    reviewedAt: raw.reviewed_at ? String(raw.reviewed_at) : null,
    rejectionReason: raw.rejection_reason ? String(raw.rejection_reason) : null,
  };
}

function parsePortalTree(data: unknown): ParentPortalTree {
  const root = (data ?? {}) as Record<string, unknown>;
  const parentRaw = root.parent as Record<string, unknown> | null;

  const parent: GlobalParent | null = parentRaw
    ? {
        id: String(parentRaw.id),
        name: String(parentRaw.name ?? '학부모'),
        phone: parentRaw.phone ? String(parentRaw.phone) : null,
        email: parentRaw.email ? String(parentRaw.email) : null,
      }
    : null;

  const children = Array.isArray(root.children)
    ? (root.children as Record<string, unknown>[]).map(parseChild)
    : [];

  const enrollmentRequests = Array.isArray(root.enrollment_requests)
    ? (root.enrollment_requests as Record<string, unknown>[]).map(parseEnrollmentRequest)
    : [];

  return { parent, children, enrollmentRequests };
}

export async function ensureGlobalParentProfile(): Promise<string | null> {
  const { data, error } = await getCoreClient().rpc('ensure_global_parent_profile');
  if (error) throw error;
  return data ? String(data) : null;
}

export async function updateMyParentPhone(phone: string): Promise<string | null> {
  const { data, error } = await getCoreClient().rpc('update_my_parent_phone' as never, {
    p_phone: phone.trim() || null,
  } as never);
  if (error) throw error;

  const row = (data ?? {}) as { phone?: string | null };
  return row.phone ? String(row.phone) : null;
}

export async function fetchParentPortalTree(): Promise<ParentPortalTree> {
  const { data, error } = await getCoreClient().rpc('get_my_parent_portal_tree');
  if (error) throw error;
  return parsePortalTree(data);
}
