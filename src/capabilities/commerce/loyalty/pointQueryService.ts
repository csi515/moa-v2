import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { PointAccount, PointTransaction, PointTransactionType } from './types';

type AccountRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  balance: number | string;
  updated_at: string;
  created_at: string;
};

type TxRow = {
  id: string;
  organization_id: string;
  customer_id: string;
  type: PointTransactionType;
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

function mapAccount(row: AccountRow): PointAccount {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    balance: toNumber(row.balance),
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  };
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

export type PointTransactionListQuery = {
  organizationId: string;
  customerId: string;
  /** 미지정 또는 ALL = 전체 */
  type?: PointTransactionType | 'ALL';
  limit?: number;
};

/**
 * 포인트 잔액·거래 조회.
 * 잔액은 point_accounts.balance 만 사용(거래 합산으로 재계산하지 않음).
 * 모든 조회에 organization_id + customer_id 필수.
 */
export const pointQueryService = {
  /**
   * 사업장×고객 잔액. 계정이 없으면 null(잔액 0으로 표시해도 됨).
   */
  async getAccount(
    organizationId: string,
    customerId: string
  ): Promise<PointAccount | null> {
    const client = ensureClient();
    const { data, error } = await client
      .from('point_accounts')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('customer_id', customerId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapAccount(data as AccountRow) : null;
  },

  /** 잔액만 — 계정 없으면 0 (합산 재계산 금지) */
  async getBalance(organizationId: string, customerId: string): Promise<number> {
    const account = await this.getAccount(organizationId, customerId);
    return account?.balance ?? 0;
  },

  /**
   * PointTransaction 기준 이력.
   * organization_id·customer_id 동시 필터로 타 사업장 혼입 방지.
   */
  async listTransactions(
    query: PointTransactionListQuery
  ): Promise<PointTransaction[]> {
    const orgId = query.organizationId?.trim();
    const customerId = query.customerId?.trim();
    if (!orgId || !customerId) {
      throw new Error('organization_id와 customer_id가 필요합니다.');
    }

    const client = ensureClient();
    const limit = Math.min(Math.max(1, query.limit ?? 200), 500);

    let builder = client
      .from('point_transactions')
      .select('*')
      .eq('organization_id', orgId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query.type && query.type !== 'ALL') {
      builder = builder.eq('type', query.type);
    }

    const { data, error } = await builder;
    if (error) throw error;
    return ((data as TxRow[] | null) ?? []).map(mapTx);
  },

  /**
   * 여러 고객 잔액 일괄 조회 (목록용).
   * 반환 Map 키 = customerId. 없는 고객은 Map에 없음 → 0 취급.
   */
  async getBalancesByCustomerIds(
    organizationId: string,
    customerIds: string[]
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    const ids = [...new Set(customerIds.filter(Boolean))];
    if (!organizationId || ids.length === 0) return result;

    const client = ensureClient();
    const { data, error } = await client
      .from('point_accounts')
      .select('customer_id, balance')
      .eq('organization_id', organizationId)
      .in('customer_id', ids);
    if (error) throw error;

    for (const row of (data as { customer_id: string; balance: number | string }[] | null) ?? []) {
      result.set(row.customer_id, toNumber(row.balance));
    }
    return result;
  },
};
