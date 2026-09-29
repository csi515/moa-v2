import type { MonthlyTuitionWorkFilter } from '@/core/finance/monthlyTuitionStatus';

export type ViewMode = 'invoices' | 'combined';

export const COMBINED_BILLING_STATUS_FILTER_LABELS: Record<MonthlyTuitionWorkFilter, string> = {
  all: '전체',
  paid: '납부완료',
  unpaid: '미납',
  no_invoice: '청구서 없음',
};

export interface TuitionStats {
  totalBilled: number;
  totalPaid: number;
  totalUnpaid: number;
  collectionRate: number;
  unpaidCount: number;
  totalCount: number;
}
