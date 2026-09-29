import { getCoreClient } from '../../../lib/supabase';

export interface OrganizationSearchResult {
  id: string;
  name: string;
  industryType: string;
}

export interface JoinRequest {
  id: string;
  organizationId: string;
  userId: string;
  requestedRole: string;
  status: 'pending' | 'approved' | 'rejected';
  message: string | null;
  rejectionReason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  organizationName: string;
  industryType: string;
}

export async function searchOrganizations(query: string): Promise<OrganizationSearchResult[]> {
  const { data, error } = await getCoreClient()
    .from('organizations')
    .select('id, name, industry_type')
    .eq('is_active', true)
    .ilike('name', `%${query}%`)
    .limit(10);

  if (error) throw error;

  return (data ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    industryType: org.industry_type,
  }));
}

export async function submitJoinRequest(
  organizationId: string,
  message?: string
): Promise<string> {
  const { data, error } = await getCoreClient().rpc('submit_join_request', {
    p_org_id: organizationId,
    p_message: message ?? null,
  });

  if (error) throw error;
  return data;
}

export async function getMyJoinRequests(): Promise<JoinRequest[]> {
  const { data, error } = await getCoreClient().rpc('get_my_join_requests');

  if (error) throw error;

  const requests = (data as Array<{
    id: string;
    organization_id: string;
    user_id: string;
    requested_role: string;
    status: string;
    message: string | null;
    rejection_reason: string | null;
    created_at: string;
    resolved_at: string | null;
    organization_name: string;
    industry_type: string;
  }>) ?? [];

  return requests.map((req) => ({
    id: req.id,
    organizationId: req.organization_id,
    userId: req.user_id,
    requestedRole: req.requested_role,
    status: req.status as 'pending' | 'approved' | 'rejected',
    message: req.message,
    rejectionReason: req.rejection_reason,
    createdAt: req.created_at,
    resolvedAt: req.resolved_at,
    organizationName: req.organization_name,
    industryType: req.industry_type,
  }));
}

export interface OrganizationJoinRequest {
  id: string;
  organizationId: string;
  userId: string;
  requestedRole: string;
  status: string;
  message: string | null;
  rejectionReason: string | null;
  createdAt: string;
  resolvedAt: string | null;
  userName: string | null;
  userEmail: string | null;
  approvedByName: string | null;
}

export async function getOrganizationJoinRequests(
  organizationId: string,
  status: string = 'pending'
): Promise<OrganizationJoinRequest[]> {
  const { data, error } = await getCoreClient().rpc('get_organization_join_requests', {
    p_org_id: organizationId,
    p_status: status,
  });

  if (error) throw error;

  const requests = (data as Array<{
    id: string;
    organization_id: string;
    user_id: string;
    requested_role: string;
    status: string;
    message: string | null;
    rejection_reason: string | null;
    created_at: string;
    resolved_at: string | null;
    user_name: string | null;
    user_email: string | null;
    approved_by_name: string | null;
  }>) ?? [];

  return requests.map((req) => ({
    id: req.id,
    organizationId: req.organization_id,
    userId: req.user_id,
    requestedRole: req.requested_role,
    status: req.status,
    message: req.message,
    rejectionReason: req.rejection_reason,
    createdAt: req.created_at,
    resolvedAt: req.resolved_at,
    userName: req.user_name,
    userEmail: req.user_email,
    approvedByName: req.approved_by_name,
  }));
}

export async function approveJoinRequest(requestId: string): Promise<void> {
  const { error } = await getCoreClient().rpc('approve_join_request', {
    p_request_id: requestId,
  });

  if (error) throw error;
}

export async function rejectJoinRequest(requestId: string, reason?: string): Promise<void> {
  const { error } = await getCoreClient().rpc('reject_join_request', {
    p_request_id: requestId,
    p_reason: reason ?? null,
  });

  if (error) throw error;
}
