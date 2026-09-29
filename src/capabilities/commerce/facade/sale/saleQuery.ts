/**
 * 판매 조회·표시 순수 헬퍼. organization 스코프는 호출부가 넣는다.
 */
import type { Sale, SalePaymentMethod } from '@/capabilities/commerce/saleLedger';

/** 판매번호 표시 (UUID 앞 8자) */
export function formatSaleNumber(saleId: string): string {
  return saleId.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export interface SaleListItem extends Sale {
  customerName: string | null;
  productSummaries: string[];
  itemCount: number;
}

export type SalePaymentFilter = 'ALL' | SalePaymentMethod;
export type SaleCustomerFilter = 'ALL' | 'MEMBER' | 'GUEST';

export interface SaleListQuery {
  organizationId: string;
  /** YYYY-MM-DD (로컬 날짜) */
  date: string;
  paymentMethod?: SalePaymentFilter;
  customerFilter?: SaleCustomerFilter;
  search?: string;
}

export type SaleCustomerOption = {
  id: string;
  name: string;
  phone: string | null;
};
