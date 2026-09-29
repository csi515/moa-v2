/**
 * 고객별 구매 조회. organization_id + customer_id 필수.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { SalePaymentMethod, SaleStatus } from '@/capabilities/commerce/saleLedger';
import type { SaleListItem } from './saleQuery';

type SaleRow = {
  id: string;
  organization_id: string;
  customer_id: string | null;
  total_amount: number | string;
  points_used?: number | string | null;
  payment_method: SalePaymentMethod;
  status: SaleStatus;
  created_at: string;
};

type SaleItemRow = {
  sale_id: string;
  product_name_snapshot: string;
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

export const customerPurchaseService = {
  async listSalesByCustomer(params: {
    organizationId: string;
    customerId: string;
    limit?: number;
  }): Promise<SaleListItem[]> {
    const client = ensureClient();
    const orgId = params.organizationId?.trim();
    const customerId = params.customerId?.trim();
    if (!orgId || !customerId) {
      throw new Error('organization_id와 customer_id가 필요합니다.');
    }
    const limit = Math.min(Math.max(1, params.limit ?? 20), 100);

    const { data: saleRows, error: saleError } = await client
      .from('sales')
      .select('*')
      .eq('organization_id', orgId)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (saleError) throw saleError;

    const sales = (saleRows as SaleRow[] | null) ?? [];
    if (sales.length === 0) return [];

    const saleIds = sales.map((s) => s.id);
    const { data: itemRows, error: itemsError } = await client
      .from('sale_items')
      .select('sale_id, product_name_snapshot')
      .in('sale_id', saleIds)
      .order('id', { ascending: true });
    if (itemsError) throw itemsError;

    const itemsBySale = new Map<string, SaleItemRow[]>();
    for (const row of (itemRows as SaleItemRow[] | null) ?? []) {
      const list = itemsBySale.get(row.sale_id) ?? [];
      list.push(row);
      itemsBySale.set(row.sale_id, list);
    }

    return sales.map((sale) => {
      const items = itemsBySale.get(sale.id) ?? [];
      return {
        id: sale.id,
        organizationId: sale.organization_id,
        customerId: sale.customer_id,
        totalAmount: toNumber(sale.total_amount),
        pointsUsed: toNumber(sale.points_used ?? 0),
        paymentMethod: sale.payment_method,
        status: sale.status,
        createdAt: sale.created_at,
        customerName: null,
        productSummaries: items.map((i) => i.product_name_snapshot),
        itemCount: items.length,
      };
    });
  },

  async getCustomerPurchaseSummary(params: {
    organizationId: string;
    customerId: string;
    recentLimit?: number;
  }): Promise<{
    totalCount: number;
    recentSales: SaleListItem[];
    latestAmount: number;
  }> {
    const client = ensureClient();
    const orgId = params.organizationId?.trim();
    const customerId = params.customerId?.trim();
    if (!orgId || !customerId) {
      throw new Error('organization_id와 customer_id가 필요합니다.');
    }

    const [countRes, recentSales] = await Promise.all([
      client
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('customer_id', customerId),
      this.listSalesByCustomer({
        organizationId: orgId,
        customerId,
        limit: params.recentLimit ?? 5,
      }),
    ]);
    if (countRes.error) throw countRes.error;

    return {
      totalCount: countRes.count ?? 0,
      recentSales,
      latestAmount: recentSales[0]?.totalAmount ?? 0,
    };
  },
};
