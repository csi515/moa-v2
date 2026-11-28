/**
 * Phase 3a: 테넌트 할당·재고·예약 정책.
 * SSOT: core.allocation_policies (+ settings 폴백)
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { Database, Json } from '@/lib/supabase/database.types';
import { parseSupabaseError } from '@/shared/errors/supabaseErrorParser';

export type PolicyMode = 'forbid' | 'warn' | 'allow';

export interface AllocationPolicy {
  organizationId: string;
  overbookMode: PolicyMode;
  negativeStockMode: PolicyMode;
  holdTtlSeconds: number;
  allowWaitlist: boolean;
  enableSafetyStockAlert: boolean;
  defaultSafetyStock: number;
}

export type AllocationPolicyPatch = Partial<
  Omit<AllocationPolicy, 'organizationId'>
>;

type AllocationRow = Database['core']['Tables']['allocation_policies']['Row'];

const DEFAULTS: Omit<AllocationPolicy, 'organizationId'> = {
  overbookMode: 'forbid',
  negativeStockMode: 'forbid',
  holdTtlSeconds: 900,
  allowWaitlist: true,
  enableSafetyStockAlert: true,
  defaultSafetyStock: 0,
};

function asMode(raw: unknown, fallback: PolicyMode): PolicyMode {
  if (raw === 'forbid' || raw === 'warn' || raw === 'allow') return raw;
  return fallback;
}

function mapRow(row: AllocationRow): AllocationPolicy {
  return {
    organizationId: row.organization_id,
    overbookMode: asMode(row.overbook_mode, 'forbid'),
    negativeStockMode: asMode(row.negative_stock_mode, 'forbid'),
    holdTtlSeconds: row.hold_ttl_seconds,
    allowWaitlist: row.allow_waitlist,
    enableSafetyStockAlert: row.enable_safety_stock_alert,
    defaultSafetyStock: row.default_safety_stock,
  };
}

function mapResolvedJson(orgId: string, raw: Record<string, unknown>): AllocationPolicy {
  return {
    organizationId: orgId,
    overbookMode: asMode(raw.overbook_mode, 'forbid'),
    negativeStockMode: asMode(raw.negative_stock_mode, 'forbid'),
    holdTtlSeconds: Number(raw.hold_ttl_seconds) || 900,
    allowWaitlist: raw.allow_waitlist !== false,
    enableSafetyStockAlert: raw.enable_safety_stock_alert !== false,
    defaultSafetyStock: Math.max(0, Number(raw.default_safety_stock) || 0),
  };
}

export function defaultAllocationPolicy(organizationId: string): AllocationPolicy {
  return { organizationId, ...DEFAULTS };
}

/** 클라이언트 정원 가드 (오프라인/미러용) */
export function evaluateOverbook(
  policy: AllocationPolicy,
  bookedCount: number,
  maxCapacity: number
): { allowed: boolean; overbooked: boolean; suggestWaitlist: boolean } {
  if (bookedCount < maxCapacity) {
    return { allowed: true, overbooked: false, suggestWaitlist: false };
  }
  if (policy.overbookMode === 'forbid') {
    return {
      allowed: false,
      overbooked: true,
      suggestWaitlist: policy.allowWaitlist,
    };
  }
  return { allowed: true, overbooked: true, suggestWaitlist: false };
}

/** 클라이언트 재고 가드 */
export function evaluateNegativeStock(
  policy: AllocationPolicy,
  quantityAfter: number
): { allowed: boolean; warning: boolean } {
  if (quantityAfter >= 0) return { allowed: true, warning: false };
  if (policy.negativeStockMode === 'forbid') {
    return { allowed: false, warning: false };
  }
  return {
    allowed: true,
    warning: policy.negativeStockMode === 'warn',
  };
}

export async function resolveAllocationPolicy(
  organizationId: string
): Promise<AllocationPolicy> {
  if (!organizationId || !isSupabaseConfigured()) {
    return defaultAllocationPolicy(organizationId || 'local-org');
  }
  try {
    const { data, error } = await getCoreClient().rpc('resolve_allocation_policy', {
      p_org_id: organizationId,
    });
    if (error) throw error;
    if (data && typeof data === 'object') {
      return mapResolvedJson(organizationId, data as Record<string, unknown>);
    }
  } catch {
    // table/RPC 미배포 폴백
  }
  try {
    const { data, error } = await getCoreClient()
      .from('allocation_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw error;
    if (data) return mapRow(data);
  } catch {
    // ignore
  }
  return defaultAllocationPolicy(organizationId);
}

export async function upsertAllocationPolicy(
  organizationId: string,
  patch: AllocationPolicyPatch
): Promise<AllocationPolicy> {
  const payload: Json = {
    overbook_mode: patch.overbookMode,
    negative_stock_mode: patch.negativeStockMode,
    hold_ttl_seconds: patch.holdTtlSeconds,
    allow_waitlist: patch.allowWaitlist,
    enable_safety_stock_alert: patch.enableSafetyStockAlert,
    default_safety_stock: patch.defaultSafetyStock,
  };

  try {
    const { data, error } = await getCoreClient().rpc('upsert_allocation_policy', {
      p_org_id: organizationId,
      p_patch: payload,
    });
    if (error) throw error;
    if (data && typeof data === 'object' && 'organization_id' in (data as object)) {
      return mapRow(data as AllocationRow);
    }
  } catch (err) {
    throw new Error(
      parseSupabaseError(err, { entity: '할당 정책', action: '저장' }).userMessage
    );
  }
  return resolveAllocationPolicy(organizationId);
}

/** 온보딩 시드: settings stub → 테이블 행 */
export async function ensureAllocationPolicySeeded(
  organizationId: string,
  stub?: {
    overbook_mode?: string;
    negative_stock_mode?: string;
    hold_ttl_seconds?: number;
  }
): Promise<void> {
  if (!organizationId || !isSupabaseConfigured()) return;
  try {
    await upsertAllocationPolicy(organizationId, {
      overbookMode: asMode(stub?.overbook_mode, 'forbid'),
      negativeStockMode: asMode(stub?.negative_stock_mode, 'forbid'),
      holdTtlSeconds: stub?.hold_ttl_seconds ?? 900,
    });
  } catch {
    // 미배포 환경 skip
  }
}
