import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { saleService } from '@/capabilities/commerce/saleLedger';
import { saleReturnService } from '@/capabilities/commerce/saleLedger';
import type { PointTransaction } from './types';
import {
  POINT_RETURN_EARN_CLAWBACK_DESC_PREFIX,
  POINT_RETURN_REDEEM_RESTORE_DESC_PREFIX,
  POINT_RETURN_REF_TYPE,
  planSaleReturnPointAdjustments,
} from './saleReturnPointPlan';

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

export type SaleReturnPointReverseResult = {
  skipped: boolean;
  reason?:
    | 'no_customer'
    | 'no_sale'
    | 'zero_return_amount'
    | 'no_point_activity'
    | 'already_reversed';
  earnClawback: number;
  redeemRestore: number;
  earnTransaction: PointTransaction | null;
  redeemTransaction: PointTransaction | null;
};

async function applyAdjustRpc(params: {
  organizationId: string;
  customerId: string;
  returnId: string;
  amount: number;
  description: string;
}): Promise<{ tx: PointTransaction | null; duplicate: boolean }> {
  const client = ensureClient();
  const { data, error } = await client.rpc(
    'apply_point_adjust_for_sale_return' as never,
    {
      p_organization_id: params.organizationId,
      p_customer_id: params.customerId,
      p_return_id: params.returnId,
      p_amount: params.amount,
      p_description: params.description,
    } as never
  );

  if (error) {
    throw new Error(error.message || '반품 포인트 보정에 실패했습니다.');
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.skipped === true || payload.duplicate === true) {
    return { tx: null, duplicate: true };
  }
  return {
    tx: mapTxFromRpc(payload.transaction),
    duplicate: false,
  };
}

/**
 * 판매 반품 후 포인트 ledger 보정 (동일 returnId로 안전 재호출 가능).
 * - 원 적립(earn) → adjust(음수) clawback
 * - 원 사용(redeem) → adjust(양수) restore
 * - 부호별 unique + 원자 RPC → 부분 실패 시 나머지만 재처리, 중복 없음
 */
export const pointReturnService = {
  async reverseForSaleReturn(params: {
    organizationId: string;
    saleId: string;
    returnId: string;
    /** 이번 반품 금액(원). 생략 시 SaleReturn.totalAmount 조회 */
    returnAmount?: number;
  }): Promise<SaleReturnPointReverseResult> {
    const orgId = params.organizationId.trim();
    const saleId = params.saleId.trim();
    const returnId = params.returnId.trim();
    if (!orgId || !saleId || !returnId) {
      throw new Error('사업장·판매·반품 정보가 필요합니다.');
    }

    const sale = await saleService.getSaleWithItems(orgId, saleId);
    if (!sale) {
      return {
        skipped: true,
        reason: 'no_sale',
        earnClawback: 0,
        redeemRestore: 0,
        earnTransaction: null,
        redeemTransaction: null,
      };
    }

    const customerId = sale.customerId?.trim() || null;
    if (!customerId) {
      return {
        skipped: true,
        reason: 'no_customer',
        earnClawback: 0,
        redeemRestore: 0,
        earnTransaction: null,
        redeemTransaction: null,
      };
    }

    const client = ensureClient();

    // 이미 이 반품에 대한 adjust — 부호별로 채워진 것만 스킵 (부분 실패 복구)
    const { data: existingAdjusts, error: existError } = await client
      .from('point_transactions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('reference_type', POINT_RETURN_REF_TYPE)
      .eq('reference_id', returnId)
      .eq('type', 'adjust');
    if (existError) throw existError;
    const existingRows = (existingAdjusts as TxRow[] | null) ?? [];
    const hasEarnClawbackTx = existingRows.some((r) => toNumber(r.amount) < 0);
    const hasRedeemRestoreTx = existingRows.some((r) => toNumber(r.amount) > 0);

    const { data: salePointTxs, error: saleTxError } = await client
      .from('point_transactions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('reference_type', 'sale')
      .eq('reference_id', saleId);
    if (saleTxError) throw saleTxError;

    let pointsEarned = 0;
    let pointsRedeemed = 0;
    for (const row of (salePointTxs as TxRow[] | null) ?? []) {
      if (row.type === 'earn') pointsEarned += Math.max(0, toNumber(row.amount));
      if (row.type === 'redeem') pointsRedeemed += Math.max(0, -toNumber(row.amount));
    }

    if (pointsEarned <= 0 && pointsRedeemed <= 0) {
      return {
        skipped: true,
        reason: 'no_point_activity',
        earnClawback: 0,
        redeemRestore: 0,
        earnTransaction: null,
        redeemTransaction: null,
      };
    }

    const allReturns = await saleReturnService.listReturnsForSale(orgId, saleId);
    const thisReturn = allReturns.find((r) => r.id === returnId);
    const thisReturnAmount =
      params.returnAmount != null
        ? Math.max(0, Number(params.returnAmount) || 0)
        : thisReturn
          ? thisReturn.totalAmount
          : 0;

    if (thisReturnAmount <= 0) {
      return {
        skipped: true,
        reason: 'zero_return_amount',
        earnClawback: 0,
        redeemRestore: 0,
        earnTransaction: null,
        redeemTransaction: null,
      };
    }

    const priorReturns = allReturns.filter((r) => r.id !== returnId);
    const priorReturnedAmount = priorReturns.reduce((s, r) => s + r.totalAmount, 0);
    const priorReturnIds = priorReturns.map((r) => r.id);

    let priorEarnClawed = 0;
    let priorRedeemRestored = 0;
    if (priorReturnIds.length > 0) {
      const { data: priorAdjusts, error: priorError } = await client
        .from('point_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('reference_type', POINT_RETURN_REF_TYPE)
        .eq('type', 'adjust')
        .in('reference_id', priorReturnIds);
      if (priorError) throw priorError;
      for (const row of (priorAdjusts as TxRow[] | null) ?? []) {
        const amt = toNumber(row.amount);
        if (amt < 0) priorEarnClawed += -amt;
        if (amt > 0) priorRedeemRestored += amt;
      }
    }

    const plan = planSaleReturnPointAdjustments({
      saleTotalAmount: sale.totalAmount,
      pointsEarned,
      pointsRedeemed,
      thisReturnAmount,
      priorReturnedAmount,
      priorEarnClawed,
      priorRedeemRestored,
    });

    if (plan.earnClawback <= 0 && plan.redeemRestore <= 0) {
      return {
        skipped: true,
        reason: 'no_point_activity',
        earnClawback: 0,
        redeemRestore: 0,
        earnTransaction: null,
        redeemTransaction: null,
      };
    }

    const needRedeem = plan.redeemRestore > 0 && !hasRedeemRestoreTx;
    const needEarn = plan.earnClawback > 0 && !hasEarnClawbackTx;
    if (!needRedeem && !needEarn) {
      return {
        skipped: true,
        reason: 'already_reversed',
        earnClawback: 0,
        redeemRestore: 0,
        earnTransaction: null,
        redeemTransaction: null,
      };
    }

    let earnTransaction: PointTransaction | null = null;
    let redeemTransaction: PointTransaction | null = null;

    // 사용 복구(+) 먼저 → 이후 적립 취소(-) 시 잔액 부족 가능성 감소
    // 각 단계는 독립 RPC — 한쪽만 성공해도 재호출 시 나머지만 처리
    if (needRedeem) {
      const res = await applyAdjustRpc({
        organizationId: orgId,
        customerId,
        returnId,
        amount: plan.redeemRestore,
        description: `${POINT_RETURN_REDEEM_RESTORE_DESC_PREFIX} ${plan.redeemRestore}P (sale:${saleId})`,
      });
      if (!res.duplicate) {
        redeemTransaction = res.tx;
      }
    }

    if (needEarn) {
      const res = await applyAdjustRpc({
        organizationId: orgId,
        customerId,
        returnId,
        amount: -plan.earnClawback,
        description: `${POINT_RETURN_EARN_CLAWBACK_DESC_PREFIX} ${plan.earnClawback}P (sale:${saleId})`,
      });
      if (!res.duplicate) {
        earnTransaction = res.tx;
      }
    }

    if (!earnTransaction && !redeemTransaction) {
      return {
        skipped: true,
        reason: 'already_reversed',
        earnClawback: 0,
        redeemRestore: 0,
        earnTransaction: null,
        redeemTransaction: null,
      };
    }

    return {
      skipped: false,
      earnClawback: needEarn && earnTransaction ? plan.earnClawback : 0,
      redeemRestore: needRedeem && redeemTransaction ? plan.redeemRestore : 0,
      earnTransaction,
      redeemTransaction,
    };
  },
};
