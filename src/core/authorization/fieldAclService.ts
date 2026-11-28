/**
 * Phase 4 필드 ACL 최소 — sensitive_field_policies + get_customer_masked RPC.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { parseSupabaseError } from '@/shared/errors/supabaseErrorParser';
import { canAuthorize } from './authorizationService';
import type { AuthScope, Permission } from './types';

export type SensitiveFieldPolicy = {
  entity: string;
  columnName: string;
  requiredPermission: string;
};

export type MaskedCustomer = {
  id: string;
  organization_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  pii_masked: boolean;
};

let policyCache: { at: number; rows: SensitiveFieldPolicy[] } | null = null;
const POLICY_TTL_MS = 60_000;

export async function listSensitiveFieldPolicies(): Promise<SensitiveFieldPolicy[]> {
  if (!isSupabaseConfigured()) return [];
  const now = Date.now();
  if (policyCache && now - policyCache.at < POLICY_TTL_MS) {
    return policyCache.rows;
  }
  try {
    const { data, error } = await getCoreClient()
      .from('sensitive_field_policies')
      .select('entity, column_name, required_permission');
    if (error) {
      throw new Error(
        parseSupabaseError(error, { entity: '필드 ACL', action: '조회' }).userMessage
      );
    }
    const rows = (data ?? []).map((row) => ({
      entity: String(row.entity),
      columnName: String(row.column_name),
      requiredPermission: String(row.required_permission),
    }));
    policyCache = { at: now, rows };
    return rows;
  } catch {
    return policyCache?.rows ?? [];
  }
}

/** 역할·grant 기준 컬럼 노출 가능 여부 (클라이언트 보조; SSOT는 RPC/RLS) */
export function canViewSensitiveColumn(
  role: string | null | undefined,
  scope: AuthScope,
  requiredPermission: string,
  extras?: Parameters<typeof canAuthorize>[3]
): boolean {
  return canAuthorize(role, requiredPermission, scope, extras);
}

export async function canViewEntityColumn(
  role: string | null | undefined,
  scope: AuthScope,
  entity: string,
  columnName: string,
  extras?: Parameters<typeof canAuthorize>[3]
): Promise<boolean> {
  const policies = await listSensitiveFieldPolicies();
  const hit = policies.find(
    (row) => row.entity === entity && row.columnName === columnName
  );
  if (!hit) return true;
  return canViewSensitiveColumn(role, scope, hit.requiredPermission, extras);
}

export async function getCustomerMasked(
  organizationId: string,
  customerId: string
): Promise<MaskedCustomer | null> {
  if (!organizationId || !customerId || !isSupabaseConfigured()) return null;
  const { data, error } = await getCoreClient().rpc('get_customer_masked', {
    p_org_id: organizationId,
    p_customer_id: customerId,
  });
  if (error) {
    throw new Error(
      parseSupabaseError(error, { entity: '고객', action: '마스킹 조회' }).userMessage
    );
  }
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    name: row.name == null ? null : String(row.name),
    phone: row.phone == null ? null : String(row.phone),
    email: row.email == null ? null : String(row.email),
    pii_masked: Boolean(row.pii_masked),
  };
}

export function maskPhoneLocal(phone: string | null | undefined): string {
  if (!phone) return '****';
  if (phone.length < 4) return '****';
  return `${'*'.repeat(Math.max(phone.length - 4, 0))}${phone.slice(-4)}`;
}

export type { Permission };
