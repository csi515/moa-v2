import { getCoreClient } from '@/lib/supabase';
import {
  EMPTY_ROLE_PERMISSIONS,
  normalizeRolePermissions,
  type RolePermissionMap,
} from '@/domain/permissions';

export type DynamicRoleRow = {
  id: string;
  name: string;
  description: string;
  is_system: boolean;
  permissions: RolePermissionMap;
};

export type DynamicMemberRow = {
  id: string;
  user_id: string;
  role: string;
  organization_role_id: string | null;
  custom_role_id?: string | null;
  is_active?: boolean;
  joined_at?: string;
  email?: string;
  name?: string;
  feature_permissions?: Record<string, boolean>;
};

export async function listDynamicRoles(organizationId: string): Promise<DynamicRoleRow[]> {
  const client = getCoreClient();
  const roleRes = await client.from('organization_roles').select('*').eq('tenant_id', organizationId);
  if (roleRes.error) throw new Error(roleRes.error.message);
  return ((roleRes.data ?? []) as unknown as DynamicRoleRow[]).map((row) => ({
    ...row,
    permissions: normalizeRolePermissions(row.permissions) ?? EMPTY_ROLE_PERMISSIONS,
  }));
}

interface DynamicQueryClient {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        order: (col: string, opts?: { ascending?: boolean }) => Promise<{ data: unknown[] | null; error: Error | null }>;
        single: () => Promise<{ data: { feature_permissions?: Record<string, boolean> | null } | null; error: Error | null }>;
      };
    };
    update: (patch: Record<string, unknown>) => {
      eq: (col: string, val: unknown) => Promise<{ error: Error | null }>;
    };
  };
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data?: unknown; error: { message: string } | null }>;
}

export async function listRoleMembers(organizationId: string): Promise<DynamicMemberRow[]> {
  const client = getCoreClient() as unknown as DynamicQueryClient;
  const memberRes = await client
    .from('organization_members')
    .select('id,user_id,role,organization_role_id,custom_role_id,is_active,joined_at,feature_permissions')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });
  if (memberRes.error) {
    // fallback if extra columns aren't matched
    const fallbackRes = await getCoreClient()
      .from('organization_members')
      .select('id,user_id,role,organization_role_id')
      .eq('organization_id', organizationId);
    if (fallbackRes.error) throw new Error(fallbackRes.error.message);
    return fallbackRes.data as unknown as DynamicMemberRow[];
  }
  return (memberRes.data ?? []) as unknown as DynamicMemberRow[];
}

export async function saveDynamicRole(input: {
  organizationId: string;
  id?: string | null;
  name: string;
  permissions: RolePermissionMap;
}): Promise<void> {
  const client = getCoreClient();
  const payload = {
    tenant_id: input.organizationId,
    name: input.name,
    permissions: input.permissions,
    updated_at: new Date().toISOString(),
  };
  const result = input.id
    ? await client.from('organization_roles').update(payload).eq('id', input.id)
    : await client.from('organization_roles').insert(payload);
  if (result.error) throw new Error(result.error.message);
}

export async function deleteDynamicRole(id: string): Promise<void> {
  const client = getCoreClient();
  const result = await client.from('organization_roles').delete().eq('id', id);
  if (result.error) throw new Error(result.error.message);
}

/**
 * 직원의 직급을 배정하거나 회수(기본 사원으로 강등).
 * PostgreSQL RPC core.assign_or_revoke_member_role을 호출하여
 * 권한 상승 방지, 사업자 침범 방어, 세션 즉시 파기(token_version 증가), 불변 감사 로그를 원자적으로 수행한다.
 */
export async function assignOrganizationRole(
  memberId: string,
  roleId: string | null,
  reason: string = ''
): Promise<void> {
  const client = getCoreClient() as unknown as DynamicQueryClient;
  const rpcRes = await client.rpc('assign_or_revoke_member_role', {
    p_target_member_id: memberId,
    p_new_role_id: roleId || null,
    p_reason: reason,
  });

  if (rpcRes.error) {
    const msg = rpcRes.error.message || '';
    if (msg.includes('does not exist') || msg.includes('not found in schema')) {
      const result = await client
        .from('organization_members')
        .update({ organization_role_id: roleId })
        .eq('id', memberId);
      if (result.error) throw new Error(result.error.message);
      return;
    }
    throw new Error(msg);
  }
}

/**
 * 특정 회원에게 원자적 직무 기능 권한(총무, 노경, 봉사, 셔틀, 소모품 등)을 부여하거나 회수.
 * DB RPC core.grant_member_feature_permission을 호출하여 세션 즉시 만료(token_version 증가)를 수행한다.
 */
export async function grantMemberFeaturePermission(
  memberId: string,
  featureKey: string,
  enabled: boolean
): Promise<void> {
  const client = getCoreClient() as unknown as DynamicQueryClient;
  const rpcRes = await client.rpc('grant_member_feature_permission', {
    p_target_member_id: memberId,
    p_feature_key: featureKey,
    p_enabled: enabled,
  });

  if (rpcRes.error) {
    const msg = rpcRes.error.message || '';
    if (msg.includes('does not exist') || msg.includes('not found in schema')) {
      // 로컬/테스트 환경 fallback
      const { data: member } = await client
        .from('organization_members')
        .select('feature_permissions')
        .eq('id', memberId)
        .single();
      const nextPerms = { ...((member?.feature_permissions as Record<string, boolean> | undefined) || {}), [featureKey]: enabled };
      const { error } = await client
        .from('organization_members')
        .update({ feature_permissions: nextPerms })
        .eq('id', memberId);
      if (error) throw new Error(error.message);
      return;
    }
    throw new Error(msg);
  }
}
