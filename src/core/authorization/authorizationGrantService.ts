/**
 * Phase 4: authorization_grants 관리 (담당 범위 할당 UI용).
 * UI에서 직접 Supabase 호출 금지 — 본 서비스만 사용.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { parseSupabaseError } from '@/shared/errors/supabaseErrorParser';
import { toAuthorizationGrant } from './authorizationService';
import { isKnownPermission, isKnownScopeType } from './registry';
import type { AuthorizationGrant, AuthScopeType, Permission } from './types';

export type GrantUpsertInput = {
  organizationId: string;
  userId: string;
  permission: Permission | string;
  scopeType: AuthScopeType;
  scopeId?: string | null;
  active?: boolean;
};

export async function listOrganizationGrants(
  organizationId: string
): Promise<AuthorizationGrant[]> {
  if (!organizationId || !isSupabaseConfigured()) return [];
  const { data, error } = await getCoreClient()
    .from('authorization_grants')
    .select('organization_id, user_id, permission, scope_type, scope_id, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('permission', { ascending: true });
  if (error) {
    throw new Error(
      parseSupabaseError(error, { entity: '권한 할당', action: '조회' }).userMessage
    );
  }
  return (data ?? [])
    .map(toAuthorizationGrant)
    .filter((grant): grant is AuthorizationGrant => grant != null);
}

export async function upsertAuthorizationGrant(
  input: GrantUpsertInput
): Promise<AuthorizationGrant> {
  if (!isSupabaseConfigured()) {
    throw new Error('데이터베이스가 구성되지 않았습니다.');
  }
  if (!isKnownPermission(String(input.permission))) {
    throw new Error('유효하지 않은 권한 키입니다.');
  }
  if (!isKnownScopeType(input.scopeType)) {
    throw new Error('유효하지 않은 스코프 유형입니다.');
  }
  if (input.scopeType !== 'organization' && !input.scopeId) {
    throw new Error('스코프 ID가 필요합니다.');
  }

  const client = getCoreClient();
  const scopeId = input.scopeType === 'organization' ? null : (input.scopeId ?? null);
  const isActive = input.active !== false;

  let existingQuery = client
    .from('authorization_grants')
    .select('id, organization_id, user_id, permission, scope_type, scope_id, is_active')
    .eq('organization_id', input.organizationId)
    .eq('user_id', input.userId)
    .eq('permission', String(input.permission))
    .eq('scope_type', input.scopeType)
    .limit(1);

  existingQuery =
    scopeId == null ? existingQuery.is('scope_id', null) : existingQuery.eq('scope_id', scopeId);

  const { data: existingRows, error: findError } = await existingQuery;
  if (findError) {
    throw new Error(
      parseSupabaseError(findError, { entity: '권한 할당', action: '조회' }).userMessage
    );
  }

  const existing = existingRows?.[0];
  if (existing?.id) {
    const { data, error } = await client
      .from('authorization_grants')
      .update({ is_active: isActive })
      .eq('id', existing.id)
      .select('organization_id, user_id, permission, scope_type, scope_id, is_active')
      .single();
    if (error || !data) {
      throw new Error(
        parseSupabaseError(error ?? new Error('empty'), {
          entity: '권한 할당',
          action: '수정',
        }).userMessage
      );
    }
    const grant = toAuthorizationGrant(data);
    if (!grant) throw new Error('권한 할당 저장에 실패했습니다.');
    return grant;
  }

  const { data, error } = await client
    .from('authorization_grants')
    .insert({
      organization_id: input.organizationId,
      user_id: input.userId,
      permission: String(input.permission),
      scope_type: input.scopeType,
      scope_id: scopeId,
      is_active: isActive,
    })
    .select('organization_id, user_id, permission, scope_type, scope_id, is_active')
    .single();

  if (error || !data) {
    throw new Error(
      parseSupabaseError(error ?? new Error('empty'), {
        entity: '권한 할당',
        action: '등록',
      }).userMessage
    );
  }
  const grant = toAuthorizationGrant(data);
  if (!grant) throw new Error('권한 할당 저장에 실패했습니다.');
  return grant;
}

export async function deactivateAuthorizationGrant(input: {
  organizationId: string;
  userId: string;
  permission: string;
  scopeType: AuthScopeType;
  scopeId?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  let q = getCoreClient()
    .from('authorization_grants')
    .update({ is_active: false })
    .eq('organization_id', input.organizationId)
    .eq('user_id', input.userId)
    .eq('permission', input.permission)
    .eq('scope_type', input.scopeType);

  q = input.scopeId
    ? q.eq('scope_id', input.scopeId)
    : q.is('scope_id', null);

  const { error } = await q;
  if (error) {
    throw new Error(
      parseSupabaseError(error, { entity: '권한 할당', action: '해제' }).userMessage
    );
  }
}
