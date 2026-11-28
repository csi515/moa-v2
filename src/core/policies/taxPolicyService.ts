/**
 * Phase 3b: 세금·절사 정책 + 금액 반영 순수 함수.
 */

import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { Database } from '@/lib/supabase/database.types';
import { parseSupabaseError } from '@/shared/errors/supabaseErrorParser';

export type TaxMode = 'inclusive' | 'exclusive';
export type RoundingMode = 'floor' | 'round' | 'ceil';

export interface TaxPolicy {
  organizationId: string;
  mode: TaxMode;
  rate: number;
  exemptCodes: string[];
}

export interface RoundingPolicy {
  organizationId: string;
  mode: RoundingMode;
  unit: number;
}

export interface TaxedAmount {
  /** 고객 지불(표시) 총액 */
  gross: number;
  /** 세전 공급가 */
  net: number;
  /** 세액 */
  tax: number;
  mode: TaxMode;
  rate: number;
}

type TaxRow = Database['core']['Tables']['tax_policies']['Row'];
type RoundingRow = Database['core']['Tables']['rounding_policies']['Row'];

export function defaultTaxPolicy(organizationId: string): TaxPolicy {
  return { organizationId, mode: 'inclusive', rate: 0, exemptCodes: [] };
}

export function defaultRoundingPolicy(organizationId: string): RoundingPolicy {
  return { organizationId, mode: 'round', unit: 1 };
}

export function applyRounding(amount: number, policy: RoundingPolicy): number {
  const unit = Math.max(1, policy.unit);
  const scaled = amount / unit;
  if (policy.mode === 'floor') return Math.floor(scaled) * unit;
  if (policy.mode === 'ceil') return Math.ceil(scaled) * unit;
  return Math.round(scaled) * unit;
}

/**
 * baseAmount: exclusive면 세전, inclusive면 세금 포함 표시가.
 */
export function applyTaxToAmount(
  baseAmount: number,
  tax: TaxPolicy,
  rounding?: RoundingPolicy
): TaxedAmount {
  const rate = Math.max(0, Math.min(1, tax.rate));
  const raw = Math.max(0, baseAmount);
  let net: number;
  let taxAmt: number;
  let gross: number;

  if (rate === 0) {
    net = raw;
    taxAmt = 0;
    gross = raw;
  } else if (tax.mode === 'exclusive') {
    net = raw;
    taxAmt = raw * rate;
    gross = raw + taxAmt;
  } else {
    gross = raw;
    net = raw / (1 + rate);
    taxAmt = gross - net;
  }

  const roundPolicy = rounding ?? defaultRoundingPolicy(tax.organizationId);
  return {
    gross: applyRounding(gross, roundPolicy),
    net: applyRounding(net, roundPolicy),
    tax: applyRounding(taxAmt, roundPolicy),
    mode: tax.mode,
    rate,
  };
}

export async function resolveTaxPolicy(organizationId: string): Promise<TaxPolicy> {
  if (!organizationId || !isSupabaseConfigured()) {
    return defaultTaxPolicy(organizationId || 'local-org');
  }
  try {
    const { data, error } = await getCoreClient().rpc('resolve_tax_policy', {
      p_org_id: organizationId,
    });
    if (error) throw error;
    if (data && typeof data === 'object') {
      const raw = data as Record<string, unknown>;
      return {
        organizationId,
        mode: raw.mode === 'exclusive' ? 'exclusive' : 'inclusive',
        rate: Number(raw.rate) || 0,
        exemptCodes: Array.isArray(raw.exempt_codes)
          ? (raw.exempt_codes as unknown[]).map(String)
          : [],
      };
    }
  } catch {
    // fallback table
  }
  try {
    const { data, error } = await getCoreClient()
      .from('tax_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const row = data as TaxRow;
      return {
        organizationId: row.organization_id,
        mode: row.mode === 'exclusive' ? 'exclusive' : 'inclusive',
        rate: Number(row.rate) || 0,
        exemptCodes: Array.isArray(row.exempt_codes)
          ? (row.exempt_codes as unknown[]).map(String)
          : [],
      };
    }
  } catch {
    // ignore
  }
  return defaultTaxPolicy(organizationId);
}

export async function resolveRoundingPolicy(
  organizationId: string
): Promise<RoundingPolicy> {
  if (!organizationId || !isSupabaseConfigured()) {
    return defaultRoundingPolicy(organizationId || 'local-org');
  }
  try {
    const { data, error } = await getCoreClient().rpc('resolve_rounding_policy', {
      p_org_id: organizationId,
    });
    if (!error && data && typeof data === 'object') {
      const raw = data as Record<string, unknown>;
      const mode = raw.mode;
      return {
        organizationId,
        mode: mode === 'floor' || mode === 'ceil' ? mode : 'round',
        unit: Math.max(1, Number(raw.unit) || 1),
      };
    }
  } catch {
    // ignore
  }
  try {
    const { data, error } = await getCoreClient()
      .from('rounding_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (error) throw error;
    if (data) {
      const row = data as RoundingRow;
      return {
        organizationId: row.organization_id,
        mode:
          row.mode === 'floor' || row.mode === 'ceil' || row.mode === 'round'
            ? row.mode
            : 'round',
        unit: Math.max(1, row.unit),
      };
    }
  } catch {
    // ignore
  }
  return defaultRoundingPolicy(organizationId);
}

export async function upsertTaxPolicy(
  organizationId: string,
  patch: Partial<Pick<TaxPolicy, 'mode' | 'rate'>>
): Promise<TaxPolicy> {
  try {
    const { data, error } = await getCoreClient()
      .from('tax_policies')
      .upsert(
        {
          organization_id: organizationId,
          mode: patch.mode ?? 'inclusive',
          rate: patch.rate ?? 0,
        },
        { onConflict: 'organization_id' }
      )
      .select('*')
      .single();
    if (error) throw error;
    const row = data as TaxRow;
    return {
      organizationId: row.organization_id,
      mode: row.mode === 'exclusive' ? 'exclusive' : 'inclusive',
      rate: Number(row.rate) || 0,
      exemptCodes: [],
    };
  } catch (err) {
    throw new Error(
      parseSupabaseError(err, { entity: '세금 정책', action: '저장' }).userMessage
    );
  }
}

export async function ensureTaxPolicySeeded(
  organizationId: string,
  stub?: { mode?: string; rate?: number }
): Promise<void> {
  if (!organizationId || !isSupabaseConfigured()) return;
  try {
    await upsertTaxPolicy(organizationId, {
      mode: stub?.mode === 'exclusive' ? 'exclusive' : 'inclusive',
      rate: stub?.rate ?? 0,
    });
  } catch {
    // skip
  }
}
