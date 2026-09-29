/**
 * Sale / SaleReturn 기간 집계. organization_id 필수.
 * Finance·포인트 잔액과 무관.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { SalePaymentMethod } from '@/capabilities/commerce/saleLedger';
import type { CommerceRevenueSummary, RevenueDateRange, RevenuePeriodPreset } from './revenueTypes';
import {
  buildCommerceRevenueSummary,
  normalizeInclusiveRange,
  type RevenueReturnInput,
  type RevenueSaleInput,
  type RevenueSaleItemInput,
} from './revenueAggregate';

type SaleRow = {
  id: string;
  total_amount: number | string;
  payment_method: SalePaymentMethod;
  status: string;
  created_at: string;
};

type SaleItemRow = {
  sale_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  quantity: number | string;
  line_amount: number | string;
};

type ReturnRow = {
  id: string;
  total_amount: number | string;
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localDayRange(dateYmd: string): { startIso: string; endIso: string } {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function addDaysYmd(dateYmd: string, days: number): string {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days, 0, 0, 0, 0);
  return toYmd(dt);
}

function inclusiveRangeIso(range: RevenueDateRange): {
  startIso: string;
  endExclusiveIso: string;
} {
  const { startIso } = localDayRange(range.fromYmd);
  const { endIso } = localDayRange(range.toYmd);
  return { startIso, endExclusiveIso: endIso };
}

export const revenueService = {
  todayYmd(): string {
    return toYmd(new Date());
  },

  resolvePresetRange(preset: RevenuePeriodPreset, custom?: RevenueDateRange): RevenueDateRange {
    const today = this.todayYmd();
    if (preset === 'today') {
      return { fromYmd: today, toYmd: today };
    }
    if (preset === 'week') {
      const now = new Date();
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
      return { fromYmd: toYmd(monday), toYmd: today };
    }
    if (preset === 'month') {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromYmd: toYmd(first), toYmd: today };
    }
    const from = custom?.fromYmd?.trim() || today;
    const to = custom?.toYmd?.trim() || today;
    return normalizeInclusiveRange({ fromYmd: from, toYmd: to });
  },

  async getSummary(params: {
    organizationId: string;
    range: RevenueDateRange;
  }): Promise<CommerceRevenueSummary> {
    const orgId = params.organizationId?.trim();
    if (!orgId) throw new Error('사업장이 필요합니다.');

    const range = this.resolvePresetRange('custom', params.range);
    const { startIso, endExclusiveIso } = inclusiveRangeIso(range);
    const client = ensureClient();

    const [salesRes, returnsRes] = await Promise.all([
      client
        .from('sales')
        .select('id, total_amount, payment_method, status, created_at')
        .eq('organization_id', orgId)
        .gte('created_at', startIso)
        .lt('created_at', endExclusiveIso)
        .order('created_at', { ascending: false }),
      client
        .from('sale_returns')
        .select('id, total_amount')
        .eq('organization_id', orgId)
        .gte('created_at', startIso)
        .lt('created_at', endExclusiveIso),
    ]);
    if (salesRes.error) throw salesRes.error;
    if (returnsRes.error) throw returnsRes.error;

    const saleRows = (salesRes.data as SaleRow[] | null) ?? [];
    const returnRows = (returnsRes.data as ReturnRow[] | null) ?? [];

    const sales: RevenueSaleInput[] = saleRows.map((s) => ({
      id: s.id,
      totalAmount: toNumber(s.total_amount),
      paymentMethod: s.payment_method,
      status: s.status,
    }));
    const returns: RevenueReturnInput[] = returnRows.map((r) => ({
      id: r.id,
      totalAmount: toNumber(r.total_amount),
    }));

    const completedIds = sales.filter((s) => s.status === 'completed').map((s) => s.id);
    const saleItems = await this.fetchSaleItems(completedIds);

    return buildCommerceRevenueSummary({
      range,
      sales,
      returns,
      saleItems,
    });
  },

  async fetchSaleItems(saleIds: string[]): Promise<RevenueSaleItemInput[]> {
    if (saleIds.length === 0) return [];
    const client = ensureClient();
    const chunkSize = 200;
    const allItems: SaleItemRow[] = [];
    for (let i = 0; i < saleIds.length; i += chunkSize) {
      const chunk = saleIds.slice(i, i + chunkSize);
      const { data, error } = await client
        .from('sale_items')
        .select('sale_id, product_id, product_name_snapshot, quantity, line_amount')
        .in('sale_id', chunk);
      if (error) throw error;
      allItems.push(...((data as SaleItemRow[] | null) ?? []));
    }
    return allItems.map((item) => ({
      saleId: item.sale_id,
      productId: item.product_id,
      productNameSnapshot: item.product_name_snapshot,
      quantity: toNumber(item.quantity),
      lineAmount: toNumber(item.line_amount),
    }));
  },

  normalizeRange(range: RevenueDateRange): RevenueDateRange {
    return normalizeInclusiveRange({
      fromYmd: range.fromYmd?.trim() || this.todayYmd(),
      toYmd: range.toYmd?.trim() || this.todayYmd(),
    });
  },

  addDaysYmd,
};

/** Retail 화면 호환 별칭 */
export const retailRevenueService = revenueService;
