import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import {
  computeEarnPoints,
  readOrgPointsEarnConfig,
} from './earnPolicy';
import type { PointTransaction } from './types';

type TxRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  type: 'earn' | 'redeem' | 'adjust';
  amount: number | string;
  balance_after: number | string;
  earn_rate_percent: number | string | null;
  base_amount: number | string | null;
  reference_type: string | null;
  reference_id: string | null;
  description: string | null;
  created_at: string;
};

function toNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function ensureClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase가 설정되지 않았습니다.');
  }
  return getCoreClient();
}

function mapTx(row: TxRow): PointTransaction {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    type: row.type,
    amount: toNumber(row.amount),
    balanceAfter: toNumber(row.balance_after),
    earnRatePercent:
      row.earn_rate_percent == null ? null : toNumber(row.earn_rate_percent),
    baseAmount: row.base_amount == null ? null : toNumber(row.base_amount),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    description: row.description,
    createdAt: row.created_at,
  };
}

function mapTxFromRpc(raw: unknown): PointTransaction | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (!row.id) return null;
  return mapTx({
    id: String(row.id),
    organization_id: String(row.organization_id),
    customer_id: String(row.customer_id),
    type: row.type as TxRow['type'],
    amount: row.amount as number | string,
    balance_after: row.balance_after as number | string,
    earn_rate_percent: (row.earn_rate_percent as number | string | null) ?? null,
    base_amount: (row.base_amount as number | string | null) ?? null,
    reference_type: (row.reference_type as string | null) ?? null,
    reference_id: (row.reference_id as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    created_at: String(row.created_at ?? ''),
  });
}

export type SalePointEarnResult = {
  skipped: boolean;
  reason?:
    | 'no_customer'
    | 'points_disabled'
    | 'earn_disabled'
    | 'zero_points'
    | 'zero_amount'
    | 'already_earned';
  pointsEarned: number;
  earnRatePercent: number | null;
  baseAmount: number | null;
  transaction: PointTransaction | null;
};

/**
 * 판매 완료 후 포인트 적립.
 * 정책 계산은 클라이언트, 잔액 반영은 core.apply_point_earn_for_sale 원자 RPC.
 */
export const pointEarnService = {
  async earnForSale(params: {
    organizationId: string;
    customerId: string | null | undefined;
    saleId: string;
    eligibleAmount: number;
  }): Promise<SalePointEarnResult> {
    const customerId = params.customerId?.trim() || null;
    if (!customerId) {
      return {
        skipped: true,
        reason: 'no_customer',
        pointsEarned: 0,
        earnRatePercent: null,
        baseAmount: null,
        transaction: null,
      };
    }

    const eligibleAmount = Math.max(0, Number(params.eligibleAmount) || 0);
    if (eligibleAmount <= 0) {
      return {
        skipped: true,
        reason: 'zero_amount',
        pointsEarned: 0,
        earnRatePercent: null,
        baseAmount: eligibleAmount,
        transaction: null,
      };
    }

    const client = ensureClient();
    const { data: orgRow, error: orgError } = await client
      .from('organizations')
      .select('settings')
      .eq('id', params.organizationId)
      .maybeSingle();
    if (orgError) throw orgError;

    const points = readOrgPointsEarnConfig(orgRow?.settings);

    if (!points.enabled) {
      return {
        skipped: true,
        reason: 'points_disabled',
        pointsEarned: 0,
        earnRatePercent: points.earnRatePercent,
        baseAmount: eligibleAmount,
        transaction: null,
      };
    }
    if (!points.earnEnabled || points.earnRatePercent <= 0) {
      return {
        skipped: true,
        reason: 'earn_disabled',
        pointsEarned: 0,
        earnRatePercent: points.earnRatePercent,
        baseAmount: eligibleAmount,
        transaction: null,
      };
    }

    const earnRatePercent = points.earnRatePercent;
    const pointsEarned = computeEarnPoints(eligibleAmount, earnRatePercent);
    if (pointsEarned <= 0) {
      return {
        skipped: true,
        reason: 'zero_points',
        pointsEarned: 0,
        earnRatePercent,
        baseAmount: eligibleAmount,
        transaction: null,
      };
    }

    const { data, error } = await client.rpc('apply_point_earn_for_sale' as never, {
      p_organization_id: params.organizationId,
      p_customer_id: customerId,
      p_sale_id: params.saleId,
      p_points_earned: pointsEarned,
      p_earn_rate_percent: earnRatePercent,
      p_base_amount: eligibleAmount,
    } as never);

    if (error) {
      throw new Error(error.message || '포인트 적립 처리에 실패했습니다.');
    }

    const payload = (data ?? {}) as Record<string, unknown>;
    if (payload.skipped === true) {
      return {
        skipped: true,
        reason: (payload.reason as SalePointEarnResult['reason']) || 'already_earned',
        pointsEarned: 0,
        earnRatePercent,
        baseAmount: eligibleAmount,
        transaction: null,
      };
    }

    return {
      skipped: false,
      pointsEarned: toNumber(payload.points_earned as number | string) || pointsEarned,
      earnRatePercent:
        payload.earn_rate_percent == null
          ? earnRatePercent
          : toNumber(payload.earn_rate_percent as number | string),
      baseAmount:
        payload.base_amount == null
          ? eligibleAmount
          : toNumber(payload.base_amount as number | string),
      transaction: mapTxFromRpc(payload.transaction),
    };
  },
};
