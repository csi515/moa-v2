import type { ParentInviteLinkCode } from '@/core/parent/services/parentInviteService';
import { parseInviteLinkCodesFromResult } from '@/core/parent/services/parentInviteService';
import { getCoreClient } from '@/lib/supabase';
import { getStorageAdapter } from '@/services/adapters';
import { STORAGE_KEYS } from '@/services/adapters/storageKeys';
import { StorageService } from '@/services/storage';
import { linkToRow } from '@/services/adapters/sync/parentLinkEntityMappers';

export type ParentAccountStatus = 'none' | 'invited' | 'connected';

export interface ParentAccountStatusItem {
  parentCustomerId: string;
  status: ParentAccountStatus;
  email: string | null;
  invitedAt: string | null;
}

export interface InviteParentResult {
  status: ParentAccountStatus;
  parentCustomerId: string;
  userId?: string;
  invitationId?: string;
  email?: string;
  organizationName?: string;
  linkCodes: ParentInviteLinkCode[];
}

export interface ConnectParentResult {
  connected: number;
  memberships: Array<{ organization_id: string; parent_customer_id: string }>;
}

export async function connectParentOnLogin(): Promise<ConnectParentResult> {
  const { data, error } = await getCoreClient().rpc('connect_parent_on_login');
  if (error) throw error;
  const result = data as {
    connected: number;
    memberships: Array<{ organization_id: string; parent_customer_id: string }>;
  };
  return {
    connected: result.connected ?? 0,
    memberships: result.memberships ?? [],
  };
}

export async function inviteParentMember(
  organizationId: string,
  parentCustomerId: string,
  email: string
): Promise<InviteParentResult> {
  const { data, error } = await getCoreClient().rpc('invite_parent_member', {
    p_org_id: organizationId,
    p_parent_customer_id: parentCustomerId,
    p_email: email.trim(),
  });
  if (error) throw error;

  const result = data as {
    status: ParentAccountStatus;
    parent_customer_id: string;
    user_id?: string;
    invitation_id?: string;
    email?: string;
    organization_name?: string;
  };

  return {
    status: result.status,
    parentCustomerId: result.parent_customer_id,
    userId: result.user_id,
    invitationId: result.invitation_id,
    email: result.email,
    organizationName: result.organization_name,
    linkCodes: parseInviteLinkCodesFromResult(data),
  };
}

/** links 동기화 후 학부모 초대 (관리자 UI·등록 플로우 공통) */
export async function inviteParentWithSync(
  organizationId: string,
  parentCustomerId: string,
  email: string
): Promise<InviteParentResult> {
  await syncAllParentStudentLinks(organizationId);
  return inviteParentMember(organizationId, parentCustomerId, email);
}

export async function revokeParentInvitation(
  organizationId: string,
  parentCustomerId: string
): Promise<void> {
  const { error } = await getCoreClient().rpc('revoke_parent_invitation', {
    p_org_id: organizationId,
    p_parent_customer_id: parentCustomerId,
  });
  if (error) throw error;
}

export async function fetchParentAccountStatuses(
  organizationId: string
): Promise<ParentAccountStatusItem[]> {
  const { data, error } = await getCoreClient().rpc('get_parent_account_statuses', {
    p_org_id: organizationId,
  });
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    parent_customer_id: string;
    status: ParentAccountStatus;
    email: string | null;
    invited_at: string | null;
  }>;

  return rows.map((row) => ({
    parentCustomerId: row.parent_customer_id,
    status: row.status,
    email: row.email,
    invitedAt: row.invited_at,
  }));
}

/** 조직 전체 parent_student_links 동기화 (storage → Supabase) */
export async function syncAllParentStudentLinks(organizationId: string): Promise<void> {
  const client = getCoreClient();
  const adapter = getStorageAdapter();

  // customers가 먼저 DB에 반영되어야 enrollment/guardian 트리거가 동작함
  if (adapter.flushPersist) {
    await adapter.flushPersist([STORAGE_KEYS.STUDENTS, STORAGE_KEYS.PARENTS]);
  }

  const links = StorageService.getParentStudentLinks();

  const { error: deleteError } = await client
    .from('parent_student_links')
    .delete()
    .eq('organization_id', organizationId);
  if (deleteError) throw deleteError;

  if (links.length > 0) {
    const rows = links.map((l) => linkToRow(l, organizationId));
    const { error } = await client.from('parent_student_links').insert(rows);
    if (error) throw error;
  }

  // 링크 삽입 순서/타이밍 이슈 대비 org 단위 브리지 동기화
  const { error: bridgeError } = await client.rpc('sync_org_parent_student_bridge', {
    p_org_id: organizationId,
  });
  if (bridgeError) {
    console.warn('sync_org_parent_student_bridge failed:', bridgeError.message);
  }
}

/** 포털→관리자 역방향: guardians + enrollments → parent_student_links */
export async function syncParentStudentLinksReverse(
  organizationId: string,
  parentId?: string
): Promise<number> {
  const client = getCoreClient();

  if (parentId) {
    const { data, error } = await client.rpc('sync_parent_student_links_for_parent_org', {
      p_parent_id: parentId,
      p_org_id: organizationId,
    });
    if (error) throw error;
    return data ?? 0;
  }

  const { data, error } = await client.rpc('sync_org_parent_student_links_reverse', {
    p_org_id: organizationId,
  });
  if (error) throw error;

  const result = data as { links_synced?: number } | null;
  return result?.links_synced ?? 0;
}
