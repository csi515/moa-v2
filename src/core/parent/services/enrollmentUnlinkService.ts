import { getCoreClient } from '@/lib/supabase';

export interface UnlinkEnrollmentResult {
  success: boolean;
  enrollmentId: string;
  organizationName?: string;
  studentName?: string;
  status: string;
  alreadyUnlinked?: boolean;
}

export async function unlinkParentEnrollment(
  enrollmentId: string
): Promise<UnlinkEnrollmentResult> {
  const { data, error } = await getCoreClient().rpc('unlink_parent_enrollment' as never, {
    p_enrollment_id: enrollmentId,
  } as never);

  if (error) throw error;

  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    success: Boolean(raw.success),
    enrollmentId: String(raw.enrollment_id ?? enrollmentId),
    organizationName: raw.organization_name ? String(raw.organization_name) : undefined,
    studentName: raw.student_name ? String(raw.student_name) : undefined,
    status: String(raw.status ?? 'withdrawn'),
    alreadyUnlinked: Boolean(raw.already_unlinked),
  };
}

export async function staffUnlinkParentEnrollment(
  organizationId: string,
  enrollmentId: string
): Promise<UnlinkEnrollmentResult> {
  const { data, error } = await getCoreClient().rpc('staff_unlink_parent_enrollment' as never, {
    p_org_id: organizationId,
    p_enrollment_id: enrollmentId,
  } as never);

  if (error) throw error;

  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    success: Boolean(raw.success),
    enrollmentId: String(raw.enrollment_id ?? enrollmentId),
    organizationName: raw.organization_name ? String(raw.organization_name) : undefined,
    studentName: raw.student_name ? String(raw.student_name) : undefined,
    status: String(raw.status ?? 'withdrawn'),
    alreadyUnlinked: Boolean(raw.already_unlinked),
  };
}
