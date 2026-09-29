/**
 * Retail 판매 타입 — Commerce/Core 공통 + POS UI 전용.
 */
export type {
  Sale,
  SaleCatalogItem,
  SaleCreateInput,
  SaleItem,
  SalePaymentMethod,
  SaleStatus,
  SaleWithItems,
} from '@/capabilities/commerce';
export {
  SALE_PAYMENT_METHODS,
  SALE_PAYMENT_METHOD_LABELS,
  SALE_STATUSES,
  SALE_STATUS_LABELS,
  buildProductNameSnapshot,
} from '@/capabilities/commerce';
import type { SalePaymentMethod } from '@/capabilities/commerce';

export {
  formatSaleNumber,
} from '@/capabilities/commerce';
export type {
  SaleCustomerFilter,
  SaleCustomerOption,
  SaleListItem,
  SaleListQuery,
  SalePaymentFilter,
} from '@/capabilities/commerce';

/** POS에서 노출하는 결제수단 */
export const POS_PAYMENT_METHODS: readonly SalePaymentMethod[] = [
  'card',
  'cash',
  'transfer',
  'other',
] as const;

/** 장바구니 라인 — Retail POS 전용 */
export interface SaleCartLine {
  key: string;
  productId: string;
  variantId: string | null;
  productName: string;
  variantName: string | null;
  unitPrice: number;
  quantity: number;
}

export function cartLineAmount(line: Pick<SaleCartLine, 'unitPrice' | 'quantity'>): number {
  return Math.max(0, line.unitPrice) * Math.max(0, line.quantity);
}

export function cartTotalAmount(lines: SaleCartLine[]): number {
  return lines.reduce((sum, line) => sum + cartLineAmount(line), 0);
}
