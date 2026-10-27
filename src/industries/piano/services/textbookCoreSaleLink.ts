import type { PaymentMethod } from '@/types';
import type { SalePaymentMethod } from '@/capabilities/commerce';

/**
 * TextbookSale ↔ Core Sale 연결 헬퍼.
 * Core SaleStatus 와 TextbookPaymentStatus 는 절대 섞지 않는다.
 */

export function toCoreSalePaymentMethod(
  method?: PaymentMethod | null
): SalePaymentMethod {
  if (method === 'card' || method === 'cash' || method === 'transfer') return method;
  if (method === 'local_currency' || method === 'onsite_card') return method;
  return 'other';
}

/** 연결 키: coreSaleId 우선, 없으면 id가 Core UUID 형태여도 미연결(legacy)로 본다 — 명시 필드만 신뢰 */
export function resolveTextbookCoreSaleId(sale: {
  id: string;
  coreSaleId?: string | null;
}): string | null {
  const linked = sale.coreSaleId?.trim();
  return linked || null;
}

export function buildLinkedTextbookSaleIds(coreSaleId: string): {
  id: string;
  coreSaleId: string;
} {
  return { id: coreSaleId, coreSaleId };
}

/** 납부 상태(업무) vs Core 거래 상태 — 문서/테스트용 상수 */
export const TEXTBOOK_PAYMENT_STATUSES = ['unpaid', 'partial', 'paid'] as const;
export const CORE_SALE_STATUSES = ['completed', 'cancelled', 'refunded'] as const;
