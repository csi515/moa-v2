import { productService } from '@/capabilities/commerce';
import { inventoryService, TEXTBOOK_SALE_MOVEMENT_REF } from '@/capabilities/commerce';
import type { StockMovement } from '@/capabilities/commerce';
import { saleService, saleReturnService } from '@/capabilities/commerce';
import type { SalePaymentMethod, SaleReturnWithItems, SaleWithItems } from '@/capabilities/commerce';
import { getOrganizationId } from '@/services/adapters/storageContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { STORAGE_KEYS } from '@/services/adapters';
import { getItem, setItem } from '@/services/storage/helpers';
import type { PaymentMethod, Textbook, TextbookInventoryTransaction } from '@/types';
import { resolveTextbookCoreSaleId, toCoreSalePaymentMethod } from './textbookCoreSaleLink';
import {
  computeDisplayStocksFromCurrent,
  mapMovementToTextbookTx,
} from './textbookCoreStockMovement';

function requireOrgId(): string | null {
  if (!isSupabaseConfigured()) return null;
  return getOrganizationId();
}

function persistTextbookPatch(textbookId: string, patch: Partial<Textbook>): Textbook | null {
  const list = getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
  const idx = list.findIndex((t) => t.id === textbookId);
  if (idx < 0) return null;
  const updated: Textbook = {
    ...list[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  if (patch.stock !== undefined) {
    updated.currentStock = patch.stock;
  }
  list[idx] = updated;
  setItem(STORAGE_KEYS.TEXTBOOKS, list);
  return updated;
}

async function readCoreQuantity(organizationId: string, productId: string): Promise<number> {
  const rows = await inventoryService.listStockRows(organizationId);
  return rows.find((r) => r.productId === productId && !r.variantId)?.quantity ?? 0;
}

/**
 * Piano Textbook ↔ Core Product/Inventory 재고 연동.
 * Textbook 업무(판매·청구)는 Module에 두고, 잔량·입출고 이력만 Core를 source로 사용.
 */
export const textbookCoreStock = {
  /** Supabase 설정 + 사업장 선택 시에만 true — 운영 모드에서는 local-only 재고 폴백 금지 */
  isAvailable(): boolean {
    return Boolean(requireOrgId());
  },

  /**
   * Core Product 보장 + 최초 재고 이관.
   * productId = textbook.id (1:1).
   */
  async ensureProductLinked(textbook: Textbook): Promise<Textbook> {
    const orgId = requireOrgId();
    if (!orgId) return textbook;

    const productId = (textbook.productId || textbook.id).trim();
    const existing = await productService.getProduct(orgId, productId);
    if (!existing) {
      await productService.saveProduct(orgId, {
        id: productId,
        name: textbook.title,
        price: Math.max(0, Number(textbook.salePrice ?? textbook.price) || 0),
        cost:
          textbook.costPrice == null || Number.isNaN(Number(textbook.costPrice))
            ? null
            : Math.max(0, Number(textbook.costPrice)),
        isActive: textbook.isForSale !== false,
      });
      const localStock = Math.max(0, Math.floor(Number(textbook.stock) || 0));
      if (localStock > 0) {
        const coreQty = await readCoreQuantity(orgId, productId);
        if (coreQty === 0) {
          await inventoryService.applyInbound({
            organizationId: orgId,
            productId,
            quantity: localStock,
            reason: '교재 재고 Core 이관',
          });
        }
      }
    } else {
      await productService.saveProduct(
        orgId,
        {
          name: textbook.title,
          price: Math.max(0, Number(textbook.salePrice ?? textbook.price) || 0),
          cost:
            textbook.costPrice == null || Number.isNaN(Number(textbook.costPrice))
              ? null
              : Math.max(0, Number(textbook.costPrice)),
          isActive: textbook.isForSale !== false,
        },
        productId
      );
    }

    const qty = await readCoreQuantity(orgId, productId);
    return (
      persistTextbookPatch(textbook.id, {
        productId,
        stock: qty,
        currentStock: qty,
      }) || { ...textbook, productId, stock: qty, currentStock: qty }
    );
  },

  async syncStockMirror(textbookId: string): Promise<number> {
    const orgId = requireOrgId();
    const list = getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
    const tb = list.find((t) => t.id === textbookId);
    if (!tb) return 0;
    if (!orgId) return tb.stock;

    const linked = await this.ensureProductLinked(tb);
    const productId = linked.productId || linked.id;
    const qty = await readCoreQuantity(orgId, productId);
    persistTextbookPatch(textbookId, { stock: qty, currentStock: qty, productId });
    return qty;
  },

  async syncAllStockMirrors(): Promise<void> {
    const orgId = requireOrgId();
    if (!orgId) return;
    const list = getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
    for (const tb of list) {
      await this.syncStockMirror(tb.id);
    }
  },

  /**
   * 입고(inbound) / 수동 반품입고(→ inbound, 판매 문서 없음) / 실사·손망실(adjustment).
   * 교재 판매 취소·반품 복구는 applySaleRestore(textbook_sale ref)를 사용한다.
   */
  async applyDelta(params: {
    textbookId: string;
    quantityDelta: number;
    transactionType: 'inbound' | 'adjust' | 'return';
    memo?: string;
  }): Promise<{
    textbook: Textbook;
    quantityAfter: number;
    previousStock: number;
    movement: StockMovement;
  }> {
    const orgId = requireOrgId();
    const list = getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
    const tb = list.find((t) => t.id === params.textbookId);
    if (!tb) throw new Error('교재를 찾을 수 없습니다.');

    if (!orgId) {
      throw new Error('사업장 또는 Supabase 설정이 없어 Core 재고를 사용할 수 없습니다.');
    }

    const linked = await this.ensureProductLinked(tb);
    const productId = linked.productId || linked.id;
    const delta = Number(params.quantityDelta);
    if (!Number.isFinite(delta) || delta === 0) {
      throw new Error('수량 변동값이 올바르지 않습니다.');
    }

    const previousStock = await readCoreQuantity(orgId, productId);
    let res: { movement: StockMovement; quantityAfter: number };

    if (params.transactionType === 'inbound' || params.transactionType === 'return') {
      // UI "반품 입고"(판매 문서 없음)도 Core inbound — 판매 취소용 return은 applySaleRestore
      res = await inventoryService.applyInbound({
        organizationId: orgId,
        productId,
        quantity: Math.abs(delta),
        reason:
          params.memo ||
          (params.transactionType === 'return' ? '교재 반품 입고' : '교재 입고'),
      });
    } else {
      res = await inventoryService.applyAdjustment({
        organizationId: orgId,
        productId,
        quantity: delta,
        reason: params.memo || '교재 재고 수동 조정',
      });
    }

    const updated =
      persistTextbookPatch(tb.id, {
        productId,
        stock: res.quantityAfter,
        currentStock: res.quantityAfter,
      }) || linked;

    return {
      textbook: updated,
      quantityAfter: res.quantityAfter,
      previousStock,
      movement: res.movement,
    };
  },

  /**
   * 교재 판매 출고 (TextbookSale 기준, Core Sale 문서 강제 아님).
   * movement_type=sale, quantity=음수,
   * reference_type=textbook_sale, reference_id=TextbookSale.id
   */
  async applySaleDeduction(params: {
    textbookId: string;
    quantity: number;
    saleId: string;
    memo?: string;
  }): Promise<{
    textbook: Textbook;
    previousStock: number;
    currentStock: number;
    movement: StockMovement;
  }> {
    const orgId = requireOrgId();
    const list = getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
    const tb = list.find((t) => t.id === params.textbookId);
    if (!tb) throw new Error('교재를 찾을 수 없습니다.');
    if (!orgId) {
      throw new Error('사업장 또는 Supabase 설정이 없어 Core 재고를 사용할 수 없습니다.');
    }

    const saleId = String(params.saleId || '').trim();
    if (!saleId) throw new Error('교재 판매 id가 필요합니다.');

    const linked = await this.ensureProductLinked(tb);
    const productId = linked.productId || linked.id;
    const qty = Math.floor(Number(params.quantity) || 0);
    if (qty <= 0) throw new Error('판매 수량이 올바르지 않습니다.');

    const previousStock = await readCoreQuantity(orgId, productId);
    const res = await inventoryService.applySaleDeduct({
      organizationId: orgId,
      productId,
      quantity: qty,
      saleId,
      referenceType: TEXTBOOK_SALE_MOVEMENT_REF,
      reason: params.memo || '교재 판매 출고',
    });

    const updated =
      persistTextbookPatch(tb.id, {
        productId,
        stock: res.quantityAfter,
        currentStock: res.quantityAfter,
      }) || linked;

    return {
      textbook: updated,
      previousStock,
      currentStock: res.quantityAfter,
      movement: res.movement,
    };
  },

  /**
   * 교재 판매 취소/반품 복구 (TextbookSale 기준).
   * movement_type=return, quantity=양수,
   * reference_type=textbook_sale, reference_id=TextbookSale.id
   */
  async applySaleRestore(params: {
    textbookId: string;
    quantity: number;
    saleId: string;
    memo?: string;
  }): Promise<{
    textbook: Textbook;
    previousStock: number;
    currentStock: number;
    movement: StockMovement;
  }> {
    const orgId = requireOrgId();
    const list = getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
    const tb = list.find((t) => t.id === params.textbookId);
    if (!tb) throw new Error('교재를 찾을 수 없습니다.');
    if (!orgId) {
      throw new Error('사업장 또는 Supabase 설정이 없어 Core 재고를 사용할 수 없습니다.');
    }

    const saleId = String(params.saleId || '').trim();
    if (!saleId) throw new Error('교재 판매 id가 필요합니다.');

    const linked = await this.ensureProductLinked(tb);
    const productId = linked.productId || linked.id;
    const qty = Math.floor(Number(params.quantity) || 0);
    if (qty <= 0) throw new Error('복구 수량이 올바르지 않습니다.');

    const previousStock = await readCoreQuantity(orgId, productId);
    const res = await inventoryService.applyReturnRestore({
      organizationId: orgId,
      productId,
      quantity: qty,
      saleReturnId: saleId,
      referenceType: TEXTBOOK_SALE_MOVEMENT_REF,
      reason: params.memo || '교재 판매 취소/반품',
    });

    const updated =
      persistTextbookPatch(tb.id, {
        productId,
        stock: res.quantityAfter,
        currentStock: res.quantityAfter,
      }) || linked;

    return {
      textbook: updated,
      previousStock,
      currentStock: res.quantityAfter,
      movement: res.movement,
    };
  },

  /** Core stock_movements → TextbookInventoryTransaction 표시용 */
  async listHistory(): Promise<TextbookInventoryTransaction[]> {
    const orgId = requireOrgId();
    const textbooks = getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []);
    const legacy = getItem<TextbookInventoryTransaction[]>(
      STORAGE_KEYS.TEXTBOOK_INVENTORY_TRANSACTIONS,
      []
    );

    if (!orgId) return legacy;

    const byProduct = new Map<string, Textbook>();
    for (const tb of textbooks) {
      const pid = tb.productId || tb.id;
      byProduct.set(pid, tb);
    }

    const stockRows = await inventoryService.listStockRows(orgId);
    const qtyByProduct = new Map<string, number>();
    for (const row of stockRows) {
      if (row.variantId) continue;
      qtyByProduct.set(row.productId, row.quantity);
    }

    const movements = await inventoryService.listMovements({
      organizationId: orgId,
      limit: 500,
    });

    // product별 최신순 그룹 → Core 잔량 기준 previous/current 역산
    const byProductMovements = new Map<string, StockMovement[]>();
    for (const m of movements) {
      if (!m.productId || m.variantId) continue;
      if (!byProduct.has(m.productId)) continue;
      const list = byProductMovements.get(m.productId) ?? [];
      list.push(m);
      byProductMovements.set(m.productId, list);
    }

    const coreTxs: TextbookInventoryTransaction[] = [];
    for (const [productId, productMovements] of byProductMovements) {
      const tb = byProduct.get(productId);
      if (!tb) continue;
      const currentQty = qtyByProduct.get(productId) ?? 0;
      const stocks = computeDisplayStocksFromCurrent(currentQty, productMovements);
      productMovements.forEach((m, i) => {
        coreTxs.push(mapMovementToTextbookTx(m, tb, stocks[i]));
      });
    }

    // Core 이관 이전 로컬 이력 보존(동일 id 제외) — legacy TextbookInventoryTransaction 삭제하지 않음
    const coreIds = new Set(coreTxs.map((t) => t.id));
    const merged = [
      ...coreTxs,
      ...legacy.filter((t) => !coreIds.has(t.id)),
    ];
    merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return merged;
  },

  /**
   * Core create_sale RPC(원자: sale+items+재고 차감) 후 Textbook 재고 미러 동기화.
   * 반환 id = Core Sale.id → TextbookSale.id / coreSaleId 로 사용.
   *
   * 경계: Core 성공 후 Piano local persist 실패 시 compensateCoreSale(반품 RPC)로 재고·거래를 되돌린다.
   */
  async createCoreLinkedSale(params: {
    textbook: Textbook;
    studentId: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    paymentMethod?: PaymentMethod | null;
    memo?: string;
  }): Promise<{
    coreSale: SaleWithItems;
    textbook: Textbook;
    previousStock: number;
    currentStock: number;
  }> {
    const orgId = requireOrgId();
    if (!orgId) {
      throw new Error('사업장 또는 Supabase 설정이 없어 Core 판매를 사용할 수 없습니다.');
    }

    const linked = await this.ensureProductLinked(params.textbook);
    const productId = (linked.productId || linked.id).trim();
    const qty = Math.floor(Number(params.quantity) || 0);
    if (qty <= 0) throw new Error('판매 수량이 올바르지 않습니다.');

    const previousStock = await readCoreQuantity(orgId, productId);
    const paymentMethod: SalePaymentMethod = toCoreSalePaymentMethod(params.paymentMethod);

    const coreSale = await saleService.createSale({
      organizationId: orgId,
      customerId: params.studentId,
      paymentMethod,
      pointsUsed: 0,
      items: [
        {
          productId,
          productNameSnapshot: linked.title,
          quantity: qty,
          unitPrice: Math.max(0, Number(params.unitPrice) || 0),
          discountAmount: Math.max(0, Number(params.discount) || 0),
        },
      ],
    });

    const currentStock = await this.syncStockMirror(linked.id);
    const updated =
      getItem<Textbook[]>(STORAGE_KEYS.TEXTBOOKS, []).find((t) => t.id === linked.id) || linked;

    return {
      coreSale,
      textbook: updated,
      previousStock,
      currentStock,
    };
  },

  /**
 * Core 판매 보상 취소(전체 반품 RPC).
 * piano.textbook_sales INSERT 실패 시 Core 측을 되돌린다.
 */
  async compensateCoreSale(coreSaleId: string): Promise<void> {
    const orgId = requireOrgId();
    if (!orgId) return;
    const sale = await saleService.getSaleWithItems(orgId, coreSaleId);
    if (!sale || !sale.items.length) return;
    await saleReturnService.createReturn({
      organizationId: orgId,
      saleId: coreSaleId,
      reason: '교재 TextbookSale 저장 실패 보상 반품',
      items: sale.items.map((item) => ({
        saleItemId: item.id,
        quantity: Math.floor(Number(item.quantity) || 0),
      })),
    });
  },

  /**
   * Core 연동 교재 판매 취소 → create_sale_return 으로 재고 복구.
   * RPC가 return movement(reference_type=sale_return)를 기록한다.
   * coreSaleId 없으면 null(호출측 legacy restore).
   */
  async cancelCoreLinkedSale(params: {
    coreSaleId: string;
    quantity: number;
    reason?: string;
  }): Promise<SaleReturnWithItems | null> {
    const orgId = requireOrgId();
    if (!orgId) return null;
    const coreSaleId = resolveTextbookCoreSaleId({
      id: params.coreSaleId,
      coreSaleId: params.coreSaleId,
    });
    if (!coreSaleId) return null;

    const sale = await saleService.getSaleWithItems(orgId, coreSaleId);
    if (!sale) return null;

    const items = sale.items
      .map((item) => ({
        saleItemId: item.id,
        quantity: Math.floor(Number(item.quantity) || 0),
      }))
      .filter((i) => i.quantity > 0);
    if (!items.length) return null;

    return saleReturnService.createReturn({
      organizationId: orgId,
      saleId: coreSaleId,
      reason: params.reason || '교재 판매 취소',
      items,
    });
  },
};
