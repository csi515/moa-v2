/**
 * 일일 현금 시재금 마감 및 금고 실사 도메인 엔진 (Pure Functions)
 *
 * 영업 시작 준비금 + 현금 매출 - 현금 지출 = 장부상 기대 현금
 * 실제 실사 현금 - 기대 현금 = 차액 (과부족)
 */

export interface CashDenominations {
  bill_50000?: number;
  bill_10000?: number;
  bill_5000?: number;
  bill_1000?: number;
  coin_500?: number;
  coin_100?: number;
  coin_50?: number;
  coin_10?: number;
}

export type ReconciliationStatus = 'OPEN' | 'BALANCED' | 'DISCREPANCY' | 'APPROVED';

export interface PosReconciliationRecord {
  id: string;
  tenant_id: string;
  register_name: string;
  opening_cash: number;
  cash_sales: number;
  cash_refunds: number;
  cash_expenses: number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  denominations: CashDenominations;
  status: ReconciliationStatus;
  notes?: string;
  reconciled_by: string;
  approved_by?: string;
  reconciled_at: string;
}

export function calculateTotalFromDenominations(denom: CashDenominations): number {
  return (
    (denom.bill_50000 || 0) * 50000 +
    (denom.bill_10000 || 0) * 10000 +
    (denom.bill_5000 || 0) * 5000 +
    (denom.bill_1000 || 0) * 1000 +
    (denom.coin_500 || 0) * 500 +
    (denom.coin_100 || 0) * 100 +
    (denom.coin_50 || 0) * 50 +
    (denom.coin_10 || 0) * 10
  );
}

export function computeExpectedCash(
  openingCash: number,
  cashSales: number,
  cashRefunds: number,
  cashExpenses: number
): number {
  return openingCash + cashSales - cashRefunds - cashExpenses;
}

export function computeDiscrepancy(expectedCash: number, actualCash: number): {
  difference: number;
  status: ReconciliationStatus;
} {
  const diff = actualCash - expectedCash;
  if (diff === 0) {
    return { difference: 0, status: 'BALANCED' };
  }
  return { difference: diff, status: 'DISCREPANCY' };
}

export function validateReconciliationInput(
  registerName: string,
  openingCash: number,
  actualCash: number
): { isValid: boolean; error?: string } {
  if (!registerName || registerName.trim().length === 0) {
    return { isValid: false, error: '포스/금고 식별명을 입력해 주세요.' };
  }
  if (openingCash < 0) {
    return { isValid: false, error: '개점 준비금은 0원 이상이어야 합니다.' };
  }
  if (actualCash < 0) {
    return { isValid: false, error: '실제 실사 현금은 0원 이상이어야 합니다.' };
  }
  return { isValid: true };
}
