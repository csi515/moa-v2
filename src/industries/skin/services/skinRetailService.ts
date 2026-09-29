import { productService } from '@/capabilities/commerce';
import { inventoryService } from '@/capabilities/commerce';
import { saleService, saleReturnService } from '@/capabilities/commerce';
import type { SalePaymentMethod, SaleReturnWithItems } from '@/capabilities/commerce';
import { customerLinkService } from '@/core/customer/services/customerLinkService';
import type { CustomerSearchResult } from '@/core/customer/services/customerLinkService';
import { recordRetailSaleReturnIncomeReversal } from '@/core/finance/billingIncomeLink';
import { StorageService } from '@/services/storage';
import type { PaymentMethod } from '@/types';
import { migrateSkinRetailCatalogIfNeeded } from './skinRetailCatalogMigrate';

/** Skin 상품 목록 행 (기존 RetailProduct UX와 동일 필드) */
export type SkinRetailItem = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

function toSalePaymentMethod(method: PaymentMethod): SalePaymentMethod {
  if (method === 'card' || method === 'cash' || method === 'transfer') return method;
  return 'other';
}

/**
 * Skin 상품·재고·판매 — Core commerce 위임.
 * 화면은 기존 SkinRetailView UX를 유지한다.
 *
 * ensureMigrated는 읽기/쓰기 전에 호출된다.
 * 이관은 idempotent 하므로 반복 호출해도 재고가 늘지 않는다.
 * 부분 실패 시 오류를 그대로 전달해 원인을 확인할 수 있게 한다.
 */
export const skinRetailService = {
  async ensureMigrated(organizationId: string): Promise<void> {
    try {
      await migrateSkinRetailCatalogIfNeeded(organizationId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Skin 상품 이관 중 오류가 발생했습니다.';
      throw new Error(message);
    }
  },

  async listItems(organizationId: string): Promise<SkinRetailItem[]> {
    await this.ensureMigrated(organizationId);
    const [products, stockRows] = await Promise.all([
      productService.listProducts(organizationId),
      inventoryService.listStockRows(organizationId),
    ]);

    const qtyByProduct = new Map<string, number>();
    for (const row of stockRows) {
      if (row.variantId) continue;
      qtyByProduct.set(row.productId, row.quantity);
    }

    return products
      .filter((p) => p.isActive)
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        stock: qtyByProduct.get(p.id) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  },

  async listCustomers(organizationId: string): Promise<CustomerSearchResult[]> {
    return customerLinkService.searchCustomers(organizationId, '', 50);
  },

  /**
   * 상품 저장. 재고는 절대값이 아니라 현재 잔량과의 차이로 inbound/adjustment.
   */
  async saveItem(
    organizationId: string,
    input: { id?: string; name: string; price: number; stock: number }
  ): Promise<SkinRetailItem> {
    await this.ensureMigrated(organizationId);
    const name = input.name.trim();
    if (!name) throw new Error('상품명이 필요합니다.');
    const price = Math.max(0, Number(input.price) || 0);
    const targetStock = Math.max(0, Math.floor(Number(input.stock) || 0));

    const product = await productService.saveProduct(
      organizationId,
      { name, price, isActive: true },
      input.id
    );

    const rows = await inventoryService.listStockRows(organizationId);
    const current =
      rows.find((r) => r.productId === product.id && !r.variantId)?.quantity ?? 0;
    const delta = targetStock - current;

    if (delta > 0) {
      await inventoryService.applyInbound({
        organizationId,
        productId: product.id,
        quantity: delta,
        reason: input.id ? '재고 수정(증가)' : '최초 입고',
      });
    } else if (delta < 0) {
      await inventoryService.applyAdjustment({
        organizationId,
        productId: product.id,
        quantity: delta,
        reason: '재고 수정(감소)',
      });
    }

    return {
      id: product.id,
      name: product.name,
      price: product.price,
      stock: targetStock,
    };
  },

  async sell(input: {
    organizationId: string;
    productId: string;
    quantity: number;
    customerId?: string | null;
    paymentMethod: PaymentMethod;
  }): Promise<{ saleId: string; amount: number; productName: string }> {
    await this.ensureMigrated(input.organizationId);
    const items = await this.listItems(input.organizationId);
    const product = items.find((p) => p.id === input.productId);
    if (!product) throw new Error('상품을 선택해 주세요.');

    const qty = Math.floor(Number(input.quantity) || 0);
    if (qty < 1) throw new Error('수량은 1 이상이어야 합니다.');
    if (qty > product.stock) throw new Error('재고가 부족합니다.');

    const amount = product.price * qty;
    const sale = await saleService.createSale({
      organizationId: input.organizationId,
      customerId: input.customerId || null,
      paymentMethod: toSalePaymentMethod(input.paymentMethod),
      items: [
        {
          productId: product.id,
          productNameSnapshot: product.name,
          quantity: qty,
          unitPrice: product.price,
        },
      ],
    });

    let payer: string | undefined;
    if (input.customerId) {
      const customer = await customerLinkService.getCustomerById(
        input.organizationId,
        input.customerId
      );
      payer = customer?.name;
    }

    StorageService.saveIncomeEntry({
      date: new Date().toISOString().slice(0, 10),
      category: 'product',
      amount,
      paymentMethod: input.paymentMethod,
      description: `${product.name} ${qty}개`,
      payer,
      sourceType: 'retail',
      sourceId: sale.id,
    });

    return { saleId: sale.id, amount, productName: product.name };
  },

  /**
   * Skin 상품 반품.
   * Core create_sale_return(재고) + Finance income 반전 기록.
   * 원본 IncomeEntry(sourceId=saleId)는 삭제하지 않음.
   * Skin은 포인트 ledger를 사용하지 않음.
   */
  async createReturn(input: {
    organizationId: string;
    saleId: string;
    items: Array<{ saleItemId: string; quantity: number }>;
    reason?: string;
    paymentMethod?: PaymentMethod;
  }): Promise<SaleReturnWithItems> {
    const result = await saleReturnService.createReturn({
      organizationId: input.organizationId,
      saleId: input.saleId,
      items: input.items,
      reason: input.reason,
    });

    const sale = await saleService.getSaleWithItems(
      input.organizationId,
      input.saleId
    );
    const productLabel =
      result.items.map((i) => `${i.productNameSnapshot} ${i.quantity}개`).join(', ') ||
      '상품 반품';

    let payer = '';
    if (sale?.customerId) {
      const customer = await customerLinkService.getCustomerById(
        input.organizationId,
        sale.customerId
      );
      payer = customer?.name || '';
    }

    recordRetailSaleReturnIncomeReversal({
      saleId: input.saleId,
      returnId: result.id,
      amount: result.totalAmount,
      date: new Date().toISOString().slice(0, 10),
      paymentMethod: input.paymentMethod || 'card',
      description: `반품 · ${productLabel}`,
      payer,
    });

    return result;
  },
};
