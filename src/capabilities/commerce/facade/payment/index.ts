/**
 * Commerce Payment — 판매 행의 결제수단 계약.
 * PG/정산/core.payments(정기 청구)는 소유하지 않는다.
 */
export type { SalePaymentMethod } from '@/capabilities/commerce/saleLedger';
export {
  SALE_PAYMENT_METHODS,
  SALE_PAYMENT_METHOD_LABELS,
} from '@/capabilities/commerce/saleLedger';
