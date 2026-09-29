import { getCoreClient } from '@/lib/supabase';

function parseConsentFields(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.map((item) => String(item));
    } catch {
      return [];
    }
  }
  return [];
}

export interface EnrollmentRequestStatus {
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export interface OrganizationSearchResult {
  id: string;
  name: string;
  industryType: string;
  city: string;
  phone: string;
  description: string;
}

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  studentName: string;
  organizationId: string;
  organizationName: string;
  industryType: string;
  status: EnrollmentRequestStatus['status'];
  requestedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface GuardianEnrollmentRequest {
  id: string;
  parentId: string;
  parentName: string;
  parentPhone: string | null;
  parentEmail: string | null;
  studentId: string;
  studentName: string;
  birthDate: string | null;
  gender: string | null;
  school: string | null;
  grade: string | null;
  consentFields: string[];
  relationship: string;
  status: EnrollmentRequestStatus['status'];
  requestedAt: string;
  reviewedAt: string | null;
  reviewedByName: string | null;
  rejectionReason: string | null;
  notes: string | null;
}

export async function searchOrganizations(
  query?: string,
  limit = 20
): Promise<OrganizationSearchResult[]> {
  const { data, error } = await getCoreClient().rpc('search_organizations_for_enrollment' as never, {
    p_query: query || null,
    p_limit: limit,
  } as never);

  if (error) throw error;

  return ((data as unknown[]) ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    industryType: String(row.industry_type ?? ''),
    city: String(row.city ?? ''),
    phone: String(row.phone ?? ''),
    description: String(row.description ?? ''),
  }));
}

export async function findOrganizationByCode(
  code: string
): Promise<OrganizationSearchResult | null> {
  const { data, error } = await getCoreClient().rpc('find_organization_by_public_code' as never, {
    p_code: code.trim(),
  } as never);

  if (error) throw error;
  if (!data || (data as unknown[]).length === 0) return null;

  const row = (data as unknown[])[0] as Record<string, unknown>;
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    industryType: String(row.industry_type ?? ''),
    city: String(row.city ?? ''),
    phone: String(row.phone ?? ''),
    description: String(row.description ?? ''),
  };
}

export async function requestEnrollment(params: {
  studentId: string;
  organizationId: string;
  consentFields?: string[];
  notes?: string;
}): Promise<{ requestId: string; studentName: string; organizationName: string }> {
  const { data, error } = await getCoreClient().rpc('request_guardian_enrollment' as never, {
    p_student_id: params.studentId,
    p_organization_id: params.organizationId,
    p_consent_fields: params.consentFields ?? ['display_name', 'birth_date'],
    p_notes: params.notes ?? null,
  } as never);

  if (error) throw error;

  const result = (data ?? {}) as {
    success?: boolean;
    request_id?: string;
    student_name?: string;
    organization_name?: string;
  };

  if (!result.success || !result.request_id) {
    throw new Error('연결 요청 생성에 실패했습니다.');
  }

  return {
    requestId: String(result.request_id),
    studentName: String(result.student_name ?? ''),
    organizationName: String(result.organization_name ?? ''),
  };
}

export async function cancelEnrollmentRequest(requestId: string): Promise<void> {
  const { error } = await getCoreClient().rpc('cancel_guardian_enrollment_request' as never, {
    p_request_id: requestId,
  } as never);

  if (error) throw error;
}

export async function getMyEnrollmentRequests(): Promise<EnrollmentRequest[]> {
  const { data, error } = await getCoreClient().rpc('get_my_enrollment_requests' as never);

  if (error) throw error;

  return ((data as unknown[]) ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    studentId: String(row.student_id ?? ''),
    studentName: String(row.student_name ?? ''),
    organizationId: String(row.organization_id ?? ''),
    organizationName: String(row.organization_name ?? ''),
    industryType: String(row.industry_type ?? ''),
    status: (row.status ?? 'pending') as EnrollmentRequestStatus['status'],
    requestedAt: String(row.requested_at ?? ''),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
  }));
}

export async function approveEnrollmentRequest(
  requestId: string
): Promise<{ enrollmentId: string; customerId: string }> {
  // @ts-expect-error - RPC not in generated types yet
  const { data, error } = await getCoreClient().rpc('approve_guardian_enrollment', {
    p_request_id: requestId,
  });

  if (error) throw error;

  const result = (data ?? {}) as {
    success?: boolean;
    enrollment_id?: string;
    customer_id?: string;
  };

  if (!result.success) {
    throw new Error('연결 요청 승인에 실패했습니다.');
  }

  return {
    enrollmentId: String(result.enrollment_id ?? ''),
    customerId: String(result.customer_id ?? ''),
  };
}

export async function rejectEnrollmentRequest(
  requestId: string,
  reason?: string
): Promise<void> {
  // @ts-expect-error - RPC not in generated types yet
  const { data, error } = await getCoreClient().rpc('reject_guardian_enrollment', {
    p_request_id: requestId,
    p_reason: reason ?? null,
  });

  if (error) throw error;

  const result = (data ?? {}) as { success?: boolean };
  if (result.success === false) {
    throw new Error('연결 요청 거절에 실패했습니다.');
  }
}

export async function getOrgEnrollmentRequests(
  orgId: string,
  status: EnrollmentRequestStatus['status'] = 'pending'
): Promise<GuardianEnrollmentRequest[]> {
  // @ts-expect-error - RPC not in generated types yet
  const { data, error } = await getCoreClient().rpc('get_org_enrollment_requests', {
    p_org_id: orgId,
    p_status: status,
  });

  if (error) throw error;

  return ((data as unknown[]) ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ''),
    parentId: String(row.parent_id ?? ''),
    parentName: String(row.parent_name ?? ''),
    parentPhone: row.parent_phone ? String(row.parent_phone) : null,
    parentEmail: row.parent_email ? String(row.parent_email) : null,
    studentId: String(row.student_id ?? ''),
    studentName: String(row.student_name ?? ''),
    birthDate: row.birth_date ? String(row.birth_date) : null,
    gender: row.gender ? String(row.gender) : null,
    school: row.school ? String(row.school) : null,
    grade: row.grade ? String(row.grade) : null,
    consentFields: parseConsentFields(row.consent_fields),
    relationship: String(row.relationship ?? 'other'),
    status: (row.status ?? 'pending') as EnrollmentRequestStatus['status'],
    requestedAt: String(row.requested_at ?? ''),
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reviewedByName: row.reviewed_by_name ? String(row.reviewed_by_name) : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    notes: row.notes ? String(row.notes) : null,
  }));
}
