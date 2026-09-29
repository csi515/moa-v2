import type { SalePaymentMethod } from '@/capabilities/commerce/saleLedger';

export type RevenuePeriodPreset = 'today' | 'week' | 'month' | 'custom';

export interface RevenueDateRange {
  /** YYYY-MM-DD inclusive */
  fromYmd: string;
  /** YYYY-MM-DD inclusive */
  toYmd: string;
}

export interface RevenuePaymentBreakdown {
  paymentMethod: SalePaymentMethod;
  /** 기간 내 completed 판매 total_amount 합 (반품 미차감) */
  amount: number;
  count: number;
}

export interface RevenueProductBreakdown {
  key: string;
  productId: string | null;
  productNameSnapshot: string;
  quantity: number;
  amount: number;
}

/**
 * Sale/SaleReturn 기준 매출 요약.
 * Finance·포인트 잔액과 무관. 반품은 결제수단 배분 없음.
 */
export interface CommerceRevenueSummary {
  range: RevenueDateRange;
  totalSalesAmount: number;
  saleCount: number;
  totalReturnAmount: number;
  returnCount: number;
  netSalesAmount: number;
  byPayment: RevenuePaymentBreakdown[];
  byProduct: RevenueProductBreakdown[];
}

/** Retail 화면 호환 별칭 */
export type RetailRevenueSummary = CommerceRevenueSummary;
