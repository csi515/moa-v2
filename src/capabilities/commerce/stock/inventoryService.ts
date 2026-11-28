import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { mapStockMovementRpcError } from './mapStockMovementRpcError';
import { stockLocationService } from './stockLocationService';
import type {
  InventoryStockRow,
  StockAdjustmentInput,
  StockInboundInput,
  StockListOptions,
  StockMovement,
  StockMovementListQuery,
  StockMovementType,
  StockReturnRestoreInput,
  StockSaleDeductInput,
  StockTransferInput,
} from './types';

type ProductRow = {
  id: string;
  name: string;
  product_code: string | null;
  is_active: boolean;
  safety_stock?: number | string | null;
};

type VariantRow = {
  id: string;
  product_id: string;
  name: string;
  is_active: boolean;
};

type InventoryRow = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  quantity: number | string;
  stock_location_id?: string | null;
};

type MovementRow = {
  id: string;
  organization_id: string;
  product_id: string | null;
  variant_id: string | null;
  movement_type: StockMovementType;
  quantity: number | string;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  stock_location_id?: string | null;
  created_at: string;
};

type ApplyStockMovementRpcResult = {
  movement: MovementRow;
  quantity_after: number | string;
  stock_location_id?: string;
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

function mapMovement(row: MovementRow): StockMovement {
  return {
    id: row.id,
    organizationId: row.organization_id,
    productId: row.product_id,
    variantId: row.variant_id,
    movementType: row.movement_type,
    quantity: toNumber(row.quantity),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    reason: row.reason,
    stockLocationId: row.stock_location_id ?? null,
    createdAt: row.created_at,
  };
}

async function assertProductInOrg(
  organizationId: string,
  productId: string,
  variantId: string | null
): Promise<void> {
  const client = ensureClient();
  const { data: product, error: productError } = await client
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product) throw new Error('상품을 찾을 수 없습니다.');

  if (variantId) {
    const { data: variant, error: variantError } = await client
      .from('product_variants')
      .select('id, product_id')
      .eq('id', variantId)
      .maybeSingle();
    if (variantError) throw variantError;
    if (!variant || variant.product_id !== productId) {
      throw new Error('선택한 옵션이 상품과 일치하지 않습니다.');
    }
  }
}

async function resolveStockLocationId(
  organizationId: string,
  stockLocationId?: string | null
): Promise<string> {
  if (stockLocationId) return stockLocationId;
  return stockLocationService.ensureCentral(organizationId);
}

/**
 * core.apply_stock_movement — movement + inventory 원자 변경.
 * 공개 apply* API는 이 RPC만 사용한다.
 */
export async function callApplyStockMovement(params: {
  organizationId: string;
  productId: string;
  variantId: string | null;
  movementType: StockMovementType;
  quantity: number;
  referenceType?: string | null;
  referenceId?: string | null;
  reason?: string | null;
  stockLocationId?: string | null;
}): Promise<{ movement: StockMovement; quantityAfter: number }> {
  const client = ensureClient();
  const stockLocationId = await resolveStockLocationId(
    params.organizationId,
    params.stockLocationId
  );

  const { data, error } = await client.rpc(
    'apply_stock_movement' as never,
    {
      p_organization_id: params.organizationId,
      p_product_id: params.productId,
      p_variant_id: params.variantId,
      p_movement_type: params.movementType,
      p_quantity: params.quantity,
      p_reference_type: params.referenceType ?? null,
      p_reference_id: params.referenceId ?? null,
      p_reason: params.reason ?? null,
      p_stock_location_id: stockLocationId,
    } as never
  );

  if (error) {
    throw new Error(mapStockMovementRpcError(error.message));
  }

  const payload = data as ApplyStockMovementRpcResult | null;
  if (!payload?.movement) {
    throw new Error('재고 처리에 실패했습니다.');
  }

  return {
    movement: mapMovement(payload.movement),
    quantityAfter: toNumber(payload.quantity_after),
  };
}

/**
 * Core 재고 조회·입고·판매·반품·조정·이력·창고 이동.
 * 잔량 변경은 apply_stock_movement / transfer_stock_between_locations RPC로 원자 처리.
 */
export const inventoryService = {
  async listStockRows(
    organizationId: string,
    options?: StockListOptions
  ): Promise<InventoryStockRow[]> {
    const client = ensureClient();
    const stockLocationId = await resolveStockLocationId(
      organizationId,
      options?.stockLocationId
    );

    const [productsRes, variantsRes, inventoryRes] = await Promise.all([
      client
        .from('products')
        .select('id, name, product_code, is_active, safety_stock')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true }),
      client.from('product_variants').select('id, product_id, name, is_active'),
      client
        .from('inventory')
        .select('id, product_id, variant_id, quantity, stock_location_id')
        .eq('organization_id', organizationId)
        .eq('stock_location_id', stockLocationId),
    ]);

    if (productsRes.error) throw productsRes.error;
    if (variantsRes.error) throw variantsRes.error;
    if (inventoryRes.error) throw inventoryRes.error;

    const products = (productsRes.data as ProductRow[] | null) ?? [];
    const productIds = new Set(products.map((p) => p.id));

    const variantsByProduct = new Map<string, VariantRow[]>();
    for (const v of (variantsRes.data as VariantRow[] | null) ?? []) {
      if (!productIds.has(v.product_id)) continue;
      const list = variantsByProduct.get(v.product_id) ?? [];
      list.push(v);
      variantsByProduct.set(v.product_id, list);
    }

    const qtyByVariant = new Map<string, number>();
    const qtyByProductOnly = new Map<string, number>();
    for (const row of (inventoryRes.data as InventoryRow[] | null) ?? []) {
      const qty = toNumber(row.quantity);
      if (row.variant_id) {
        qtyByVariant.set(row.variant_id, qty);
      } else if (row.product_id) {
        qtyByProductOnly.set(row.product_id, qty);
      }
    }

    const rows: InventoryStockRow[] = [];

    for (const product of products) {
      const variants = variantsByProduct.get(product.id) ?? [];
      if (variants.length > 0) {
        const sorted = [...variants].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
        for (const variant of sorted) {
          rows.push({
            key: `v:${variant.id}`,
            productId: product.id,
            productName: product.name,
            productCode: product.product_code,
            variantId: variant.id,
            variantName: variant.name,
            quantity: qtyByVariant.get(variant.id) ?? 0,
            safetyStock: Math.max(0, Math.floor(toNumber(product.safety_stock))),
            isActive: variant.is_active && product.is_active,
            productIsActive: product.is_active,
            stockLocationId,
          });
        }
      } else {
        rows.push({
          key: `p:${product.id}`,
          productId: product.id,
          productName: product.name,
          productCode: product.product_code,
          variantId: null,
          variantName: null,
          quantity: qtyByProductOnly.get(product.id) ?? 0,
          safetyStock: Math.max(0, Math.floor(toNumber(product.safety_stock))),
          isActive: product.is_active,
          productIsActive: product.is_active,
          stockLocationId,
        });
      }
    }

    return rows;
  },

  async listMovements(query: StockMovementListQuery): Promise<StockMovement[]> {
    const client = ensureClient();
    const limit = Math.min(Math.max(query.limit ?? 100, 1), 500);
    let q = client
      .from('stock_movements')
      .select('*')
      .eq('organization_id', query.organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (query.productId) {
      q = q.eq('product_id', query.productId);
    }
    if (query.variantId !== undefined) {
      if (query.variantId) {
        q = q.eq('variant_id', query.variantId);
      } else {
        q = q.is('variant_id', null);
      }
    }
    if (query.movementType) {
      q = q.eq('movement_type', query.movementType);
    }
    if (query.referenceType) {
      q = q.eq('reference_type', query.referenceType);
    }
    if (query.referenceId) {
      q = q.eq('reference_id', query.referenceId);
    }

    const { data, error } = await q;
    if (error) throw error;
    return ((data as MovementRow[] | null) ?? []).map(mapMovement);
  },

  async applyInbound(input: StockInboundInput): Promise<{
    movement: StockMovement;
    quantityAfter: number;
  }> {
    const qty = Number(input.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('입고 수량은 0보다 커야 합니다.');
    }
    if (!input.productId) {
      throw new Error('상품을 선택해 주세요.');
    }

    const variantId = input.variantId || null;
    await assertProductInOrg(input.organizationId, input.productId, variantId);

    return callApplyStockMovement({
      organizationId: input.organizationId,
      productId: input.productId,
      variantId,
      movementType: 'inbound',
      quantity: qty,
      reason: input.reason?.trim() || null,
      stockLocationId: input.stockLocationId,
    });
  },

  async applyAdjustment(input: StockAdjustmentInput): Promise<{
    movement: StockMovement;
    quantityAfter: number;
  }> {
    const delta = Number(input.quantity);
    if (!Number.isFinite(delta) || delta === 0 || !Number.isInteger(delta)) {
      throw new Error('조정 수량은 0이 아닌 정수여야 합니다.');
    }
    if (!input.productId) {
      throw new Error('상품을 선택해 주세요.');
    }
    const reason = input.reason?.trim();
    if (!reason) {
      throw new Error('조정 사유를 입력해 주세요.');
    }

    const variantId = input.variantId || null;
    await assertProductInOrg(input.organizationId, input.productId, variantId);

    return callApplyStockMovement({
      organizationId: input.organizationId,
      productId: input.productId,
      variantId,
      movementType: 'adjustment',
      quantity: delta,
      reason,
      stockLocationId: input.stockLocationId,
    });
  },

  async transferBetweenLocations(input: StockTransferInput): Promise<{
    fromQuantityAfter: number;
    toQuantityAfter: number;
    quantity: number;
  }> {
    const qty = Math.floor(Number(input.quantity) || 0);
    if (qty <= 0) throw new Error('이동 수량은 0보다 커야 합니다.');
    if (!input.productId) throw new Error('상품을 선택해 주세요.');
    if (!input.fromLocationId || !input.toLocationId) {
      throw new Error('출발·도착 창고를 선택해 주세요.');
    }
    if (input.fromLocationId === input.toLocationId) {
      throw new Error('출발과 도착 창고가 같습니다.');
    }

    const variantId = input.variantId || null;
    await assertProductInOrg(input.organizationId, input.productId, variantId);

    const client = ensureClient();
    const { data, error } = await client.rpc(
      'transfer_stock_between_locations' as never,
      {
        p_organization_id: input.organizationId,
        p_product_id: input.productId,
        p_variant_id: variantId,
        p_from_location_id: input.fromLocationId,
        p_to_location_id: input.toLocationId,
        p_quantity: qty,
        p_reason: input.reason?.trim() || null,
      } as never
    );
    if (error) throw new Error(mapStockMovementRpcError(error.message));

    const payload = data as {
      from_quantity_after?: number | string;
      to_quantity_after?: number | string;
      quantity?: number | string;
    } | null;

    return {
      fromQuantityAfter: toNumber(payload?.from_quantity_after),
      toQuantityAfter: toNumber(payload?.to_quantity_after),
      quantity: toNumber(payload?.quantity) || qty,
    };
  },

  /**
   * 판매 출고.
   * stock_movements_sale_sign_ref_chk: quantity < 0,
   * reference_type IN ('sale','textbook_sale'), reference_id 필수.
   * 기본 central 창고.
   */
  async applySaleDeduct(input: StockSaleDeductInput): Promise<{
    movement: StockMovement;
    quantityAfter: number;
  }> {
    const qty = Math.floor(Number(input.quantity) || 0);
    if (qty <= 0) {
      throw new Error('판매 차감 수량은 0보다 커야 합니다.');
    }
    const saleId = String(input.saleId || '').trim();
    if (!saleId) {
      throw new Error('판매 참조(saleId)가 필요합니다.');
    }
    if (!input.productId) {
      throw new Error('상품을 선택해 주세요.');
    }
    const referenceType =
      input.referenceType === 'textbook_sale' ? 'textbook_sale' : 'sale';

    const variantId = input.variantId || null;
    await assertProductInOrg(input.organizationId, input.productId, variantId);

    return callApplyStockMovement({
      organizationId: input.organizationId,
      productId: input.productId,
      variantId,
      movementType: 'sale',
      quantity: qty,
      referenceType,
      referenceId: saleId,
      reason: input.reason?.trim() || null,
      stockLocationId: null,
    });
  },

  /**
   * 반품/판매취소 입고.
   * stock_movements_return_sign_ref_chk: quantity > 0,
   * reference_type IN ('sale_return','textbook_sale'), reference_id 필수.
   */
  async applyReturnRestore(input: StockReturnRestoreInput): Promise<{
    movement: StockMovement;
    quantityAfter: number;
  }> {
    const qty = Math.floor(Number(input.quantity) || 0);
    if (qty <= 0) {
      throw new Error('반품 복구 수량은 0보다 커야 합니다.');
    }
    const saleReturnId = String(input.saleReturnId || '').trim();
    if (!saleReturnId) {
      throw new Error('반품 참조(saleReturnId)가 필요합니다.');
    }
    if (!input.productId) {
      throw new Error('상품을 선택해 주세요.');
    }
    const referenceType =
      input.referenceType === 'textbook_sale' ? 'textbook_sale' : 'sale_return';

    const variantId = input.variantId || null;
    await assertProductInOrg(input.organizationId, input.productId, variantId);

    return callApplyStockMovement({
      organizationId: input.organizationId,
      productId: input.productId,
      variantId,
      movementType: 'return',
      quantity: qty,
      referenceType,
      referenceId: saleReturnId,
      reason: input.reason?.trim() || null,
      stockLocationId: null,
    });
  },
};
