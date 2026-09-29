/**
 * 판매 내역 조회 (읽기 전용). organization_id 필수.
 * 수정·반품·포인트는 호출하지 않는다.
 */
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { saleReturnService } from '@/capabilities/commerce/facade/return';
import type { Sale, SaleItem, SalePaymentMethod, SaleStatus, SaleWithItems } from '@/capabilities/commerce/saleLedger';
import {
  formatSaleNumber,
  type SaleCustomerFilter,
  type SaleListItem,
  type SaleListQuery,
  type SalePaymentFilter,
} from './saleQuery';

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
  id: string;
  sale_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  line_amount: number | string;
};

type CustomerNameRow = {
  id: string;
  name: string;
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

function mapSale(row: SaleRow): Sale {
  return {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    totalAmount: toNumber(row.total_amount),
    pointsUsed: toNumber(row.points_used ?? 0),
    paymentMethod: row.payment_method,
    status: row.status,
    createdAt: row.created_at,
  };
}

function mapSaleItem(row: SaleItemRow): SaleItem {
  return {
    id: row.id,
    saleId: row.sale_id,
    productId: row.product_id,
    variantId: row.variant_id,
    productNameSnapshot: row.product_name_snapshot,
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unit_price),
    discountAmount: toNumber(row.discount_amount),
    lineAmount: toNumber(row.line_amount),
  };
}

function localDateRange(dateYmd: string): { startIso: string; endIso: string } {
  const [y, m, d] = dateYmd.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function todayYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const saleHistoryService = {
  todayYmd,

  async listSales(query: SaleListQuery): Promise<SaleListItem[]> {
    const orgId = query.organizationId?.trim();
    if (!orgId) throw new Error('사업장이 필요합니다.');

    const client = ensureClient();
    const date = query.date || todayYmd();
    const { startIso, endIso } = localDateRange(date);

    let builder = client
      .from('sales')
      .select('*')
      .eq('organization_id', orgId)
      .gte('created_at', startIso)
      .lt('created_at', endIso)
      .order('created_at', { ascending: false });

    const paymentMethod: SalePaymentFilter | undefined = query.paymentMethod;
    if (paymentMethod && paymentMethod !== 'ALL') {
      builder = builder.eq('payment_method', paymentMethod);
    }
    const customerFilter: SaleCustomerFilter | undefined = query.customerFilter;
    if (customerFilter === 'GUEST') {
      builder = builder.is('customer_id', null);
    } else if (customerFilter === 'MEMBER') {
      builder = builder.not('customer_id', 'is', null);
    }

    const { data: saleRows, error: saleError } = await builder;
    if (saleError) throw saleError;

    const sales = (saleRows as SaleRow[] | null) ?? [];
    if (sales.length === 0) return [];

    const saleIds = sales.map((s) => s.id);
    const customerIds = [
      ...new Set(sales.map((s) => s.customer_id).filter((id): id is string => Boolean(id))),
    ];

    const [itemsRes, customersRes] = await Promise.all([
      client
        .from('sale_items')
        .select('*')
        .in('sale_id', saleIds)
        .order('id', { ascending: true }),
      customerIds.length > 0
        ? client.from('customers').select('id, name').in('id', customerIds)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (itemsRes.error) throw itemsRes.error;
    if (customersRes.error) throw customersRes.error;

    const itemsBySale = new Map<string, SaleItemRow[]>();
    for (const row of (itemsRes.data as SaleItemRow[] | null) ?? []) {
      const list = itemsBySale.get(row.sale_id) ?? [];
      list.push(row);
      itemsBySale.set(row.sale_id, list);
    }

    const nameByCustomer = new Map<string, string>();
    for (const row of (customersRes.data as CustomerNameRow[] | null) ?? []) {
      nameByCustomer.set(row.id, row.name);
    }

    const search = query.search?.trim().toLowerCase() ?? '';

    const rows: SaleListItem[] = [];
    for (const sale of sales) {
      const itemRows = itemsBySale.get(sale.id) ?? [];
      const productSummaries = itemRows.map((i) => i.product_name_snapshot);
      const customerName = sale.customer_id
        ? nameByCustomer.get(sale.customer_id) ?? null
        : null;
      const mapped = mapSale(sale);

      if (search) {
        const saleNo = formatSaleNumber(sale.id).toLowerCase();
        const hay = [
          saleNo,
          sale.id.toLowerCase(),
          customerName?.toLowerCase() ?? '',
          ...productSummaries.map((p) => p.toLowerCase()),
        ].join(' ');
        if (!hay.includes(search)) continue;
      }

      rows.push({
        ...mapped,
        customerName,
        productSummaries,
        itemCount: itemRows.length,
      });
    }

    return rows;
  },

  async getSaleDetail(
    organizationId: string,
    saleId: string
  ): Promise<
    SaleWithItems & {
      customerName: string | null;
      returnedQtyByItemId: Record<string, number>;
    }
  > {
    const orgId = organizationId?.trim();
    const id = saleId?.trim();
    if (!orgId || !id) throw new Error('사업장과 판매 id가 필요합니다.');

    const client = ensureClient();

    const { data: saleRow, error: saleError } = await client
      .from('sales')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (saleError) throw saleError;
    if (!saleRow) throw new Error('판매 내역을 찾을 수 없습니다.');

    const sale = mapSale(saleRow as SaleRow);

    const { data: itemRows, error: itemsError } = await client
      .from('sale_items')
      .select('*')
      .eq('sale_id', id)
      .order('id', { ascending: true });
    if (itemsError) throw itemsError;

    let customerName: string | null = null;
    if (sale.customerId) {
      const { data: customer, error: customerError } = await client
        .from('customers')
        .select('id, name')
        .eq('id', sale.customerId)
        .maybeSingle();
      if (customerError) throw customerError;
      customerName = (customer as CustomerNameRow | null)?.name ?? null;
    }

    const returnedMap = await saleReturnService.getReturnedQtyBySaleItem(orgId, id);
    const returnedQtyByItemId: Record<string, number> = {};
    returnedMap.forEach((qty, itemId) => {
      returnedQtyByItemId[itemId] = qty;
    });

    return {
      ...sale,
      items: ((itemRows as SaleItemRow[] | null) ?? []).map(mapSaleItem),
      customerName,
      returnedQtyByItemId,
    };
  },
};
