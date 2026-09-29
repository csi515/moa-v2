import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import type { SaleItem } from './types';
import {
  computeReturnLineAmount,
  type SaleItemReturnable,
  type SaleReturn,
  type SaleReturnCreateInput,
  type SaleReturnItem,
  type SaleReturnWithItems,
} from './types';
import {
  aggregateReturnRequestLines,
  assertReturnQuantitiesAllowed,
  mapCreateSaleReturnRpcError,
} from './saleReturnPlan';

type ReturnRow = {
  id: string;
  organization_id: string;
  sale_id: string;
  total_amount: number | string;
  reason: string | null;
  created_at: string;
};

type ReturnItemRow = {
  id: string;
  sale_return_id: string;
  sale_item_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name_snapshot: string;
  quantity: number | string;
  unit_price: number | string;
  line_amount: number | string;
};

type CreateSaleReturnRpcResult = {
  id: string;
  organization_id: string;
  sale_id: string;
  total_amount: number | string;
  reason: string | null;
  created_at: string;
  items: ReturnItemRow[];
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

function mapReturn(row: ReturnRow): SaleReturn {
  return {
    id: row.id,
    organizationId: row.organization_id,
    saleId: row.sale_id,
    totalAmount: toNumber(row.total_amount),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

function mapReturnItem(row: ReturnItemRow): SaleReturnItem {
  return {
    id: row.id,
    saleReturnId: row.sale_return_id,
    saleItemId: row.sale_item_id,
    productId: row.product_id,
    variantId: row.variant_id,
    productNameSnapshot: row.product_name_snapshot,
    quantity: toNumber(row.quantity),
    unitPrice: toNumber(row.unit_price),
    lineAmount: toNumber(row.line_amount),
  };
}

/**
 * Core 반품 서비스.
 * createReturn은 core.create_sale_return RPC로
 * sale_returns + items + stock_movements(return) + inventory 를 원자 처리.
 * sales/sale_items FOR UPDATE로 누적 반품 수량·동시 초과 반품을 DB에서 차단.
 * 원본 Sale 불변. 포인트·Finance reversal은 Module 책임
 * (Retail: loyalty pointReturnService / Skin: Finance income 반전).
 */
export const saleReturnService = {
  async getReturnedQtyBySaleItem(
    organizationId: string,
    saleId: string
  ): Promise<Map<string, number>> {
    const client = ensureClient();
    const { data: returns, error: retError } = await client
      .from('sale_returns')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('sale_id', saleId);
    if (retError) throw retError;

    const returnIds = ((returns as { id: string }[] | null) ?? []).map((r) => r.id);
    const map = new Map<string, number>();
    if (returnIds.length === 0) return map;

    const { data: items, error: itemsError } = await client
      .from('sale_return_items')
      .select('sale_item_id, quantity')
      .in('sale_return_id', returnIds);
    if (itemsError) throw itemsError;

    for (const row of (items as { sale_item_id: string; quantity: number | string }[] | null) ??
      []) {
      const prev = map.get(row.sale_item_id) ?? 0;
      map.set(row.sale_item_id, prev + toNumber(row.quantity));
    }
    return map;
  },

  buildReturnableLines(
    saleItems: SaleItem[],
    returnedByItem: Map<string, number>
  ): SaleItemReturnable[] {
    return saleItems.map((item) => {
      const soldQuantity = toNumber(item.quantity);
      const returnedQuantity = returnedByItem.get(item.id) ?? 0;
      const remainingQuantity = Math.max(0, soldQuantity - returnedQuantity);
      return {
        saleItemId: item.id,
        productNameSnapshot: item.productNameSnapshot,
        productId: item.productId,
        variantId: item.variantId,
        soldQuantity,
        returnedQuantity,
        remainingQuantity,
        unitPrice: item.unitPrice,
        discountAmount: item.discountAmount,
        lineAmount: item.lineAmount,
      };
    });
  },

  async listReturnsForSale(
    organizationId: string,
    saleId: string
  ): Promise<SaleReturnWithItems[]> {
    const client = ensureClient();
    const { data: returnRows, error: retError } = await client
      .from('sale_returns')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('sale_id', saleId)
      .order('created_at', { ascending: false });
    if (retError) throw retError;

    const returns = (returnRows as ReturnRow[] | null) ?? [];
    if (returns.length === 0) return [];

    const returnIds = returns.map((r) => r.id);
    const { data: itemRows, error: itemsError } = await client
      .from('sale_return_items')
      .select('*')
      .in('sale_return_id', returnIds)
      .order('id', { ascending: true });
    if (itemsError) throw itemsError;

    const itemsByReturn = new Map<string, ReturnItemRow[]>();
    for (const row of (itemRows as ReturnItemRow[] | null) ?? []) {
      const list = itemsByReturn.get(row.sale_return_id) ?? [];
      list.push(row);
      itemsByReturn.set(row.sale_return_id, list);
    }

    return returns.map((row) => ({
      ...mapReturn(row),
      items: (itemsByReturn.get(row.id) ?? []).map(mapReturnItem),
    }));
  },

  /**
   * 반품 생성(원자): core.create_sale_return RPC
   * → returns + items + movements + inventory 복구가 한 트랜잭션.
   * 초과 반품·권한·중간 실패 시 전체 rollback (반품 문서만 남는 상태 불가).
   * 클라이언트 다중 INSERT/UPDATE 경로를 사용하지 않는다.
   */
  async createReturn(input: SaleReturnCreateInput): Promise<SaleReturnWithItems> {
    const client = ensureClient();
    const orgId = input.organizationId?.trim();
    const saleId = input.saleId?.trim();
    if (!orgId || !saleId) {
      throw new Error('사업장·판매 정보가 필요합니다.');
    }
    if (!input.items.length) {
      throw new Error('반품할 상품을 선택해 주세요.');
    }

    const aggregated = aggregateReturnRequestLines(input.items);
    if (!aggregated.length) {
      throw new Error('반품 수량은 1 이상의 정수여야 합니다.');
    }

    // UX용 사전 검증(최종 권한은 RPC FOR UPDATE)
    const { data: saleRow, error: saleError } = await client
      .from('sales')
      .select('id, organization_id, status')
      .eq('id', saleId)
      .eq('organization_id', orgId)
      .maybeSingle();
    if (saleError) throw saleError;
    if (!saleRow) throw new Error('판매 내역을 찾을 수 없습니다.');

    const { data: saleItems, error: itemsError } = await client
      .from('sale_items')
      .select('*')
      .eq('sale_id', saleId);
    if (itemsError) throw itemsError;

    const itemById = new Map(
      ((saleItems as Array<{
        id: string;
        product_name_snapshot: string;
        quantity: number | string;
        unit_price: number | string;
        discount_amount: number | string;
      }> | null) ?? []).map((row) => [row.id, row])
    );

    const returnedByItem = await this.getReturnedQtyBySaleItem(orgId, saleId);
    assertReturnQuantitiesAllowed(
      aggregated.map((line) => {
        const src = itemById.get(line.saleItemId);
        if (!src) {
          throw new Error('원본 판매 상품을 찾을 수 없습니다.');
        }
        return {
          saleItemId: line.saleItemId,
          productNameSnapshot: src.product_name_snapshot,
          soldQuantity: toNumber(src.quantity),
          alreadyReturned: returnedByItem.get(line.saleItemId) ?? 0,
          requestQuantity: line.quantity,
        };
      })
    );

    // 금액 규칙 유지용 — RPC도 동일 공식. 여기서는 사전 검증만.
    for (const line of aggregated) {
      const src = itemById.get(line.saleItemId)!;
      computeReturnLineAmount({
        returnQty: line.quantity,
        soldQty: toNumber(src.quantity),
        unitPrice: toNumber(src.unit_price),
        discountAmount: toNumber(src.discount_amount),
        alreadyReturned: returnedByItem.get(line.saleItemId) ?? 0,
      });
    }

    const { data, error } = await client.rpc('create_sale_return' as never, {
      p_organization_id: orgId,
      p_sale_id: saleId,
      p_reason: input.reason?.trim() || null,
      p_items: aggregated.map((line) => ({
        sale_item_id: line.saleItemId,
        quantity: line.quantity,
      })),
    } as never);

    if (error) {
      throw new Error(mapCreateSaleReturnRpcError(error.message));
    }

    const payload = data as CreateSaleReturnRpcResult | null;
    if (!payload?.id) {
      throw new Error('반품 처리에 실패했습니다.');
    }

    return {
      ...mapReturn(payload),
      items: (payload.items ?? []).map(mapReturnItem),
    };
  },
};
