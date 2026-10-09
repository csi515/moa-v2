/**
 * 간이 수기 장부 & 일일 시재 마감 엔진 (Pure Function Domain)
 *
 * 대상: 0원 비용 환경에서 현금/계좌이체 수납 기록 및 마감 시재 대조
 * 순수 로직:
 *  1. 결제 수단별 수납액 합산
 *  2. 현금 시재 오차(불일치) 계산식
 *  3. 마감 확정 잠금 판정식
 */

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER';
export type EntryType = 'INCOME' | 'EXPENSE';

export interface LedgerEntry {
  id: string;
  type: EntryType;
  method: PaymentMethod;
  amount: number;
  description: string;
  timestamp: string; // ISO String
}

export interface DailyAggregationResult {
  cashIncome: number;
  cashExpense: number;
  transferIncome: number;
  cardIncome: number;
  otherIncome: number;
  totalIncome: number;
  totalExpense: number;
  netRevenue: number;
}

export function aggregateDailyLedger(
  entries: LedgerEntry[]
): DailyAggregationResult {
  let cashIncome = 0;
  let cashExpense = 0;
  let transferIncome = 0;
  let cardIncome = 0;
  let otherIncome = 0;
  let totalExpense = 0;

  for (const e of entries) {
    if (e.type === 'INCOME') {
      switch (e.method) {
        case 'CASH':
          cashIncome += e.amount;
          break;
        case 'TRANSFER':
          transferIncome += e.amount;
          break;
        case 'CARD':
          cardIncome += e.amount;
          break;
        case 'OTHER':
          otherIncome += e.amount;
          break;
      }
    } else {
      totalExpense += e.amount;
      if (e.method === 'CASH') {
        cashExpense += e.amount;
      }
    }
  }

  const totalIncome = cashIncome + transferIncome + cardIncome + otherIncome;
  const netRevenue = totalIncome - totalExpense;

  return {
    cashIncome,
    cashExpense,
    transferIncome,
    cardIncome,
    otherIncome,
    totalIncome,
    totalExpense,
    netRevenue,
  };
}

export interface CashVarianceParams {
  openingCash: number; // 시작 준비금
  cashIncome: number;
  cashExpense: number;
  countedCash: number; // 실제 실측 현금
}

export interface CashVarianceResult {
  expectedCash: number;
  countedCash: number;
  varianceAmount: number; // counted - expected (음수면 부족, 양수면 과잉)
  status: 'MATCHED' | 'SHORTAGE' | 'OVERAGE';
}

export function calculateCashVariance(
  params: CashVarianceParams
): CashVarianceResult {
  const { openingCash, cashIncome, cashExpense, countedCash } = params;
  const expectedCash = openingCash + cashIncome - cashExpense;
  const varianceAmount = countedCash - expectedCash;

  let status: 'MATCHED' | 'SHORTAGE' | 'OVERAGE' = 'MATCHED';
  if (varianceAmount < 0) {
    status = 'SHORTAGE';
  } else if (varianceAmount > 0) {
    status = 'OVERAGE';
  }

  return {
    expectedCash,
    countedCash,
    varianceAmount,
    status,
  };
}

export interface DailyClosingState {
  date: string; // YYYY-MM-DD
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  countedCash: number;
  varianceAmount: number;
}

export function lockDailyClosing(
  currentState: DailyClosingState,
  params: {
    countedCash: number;
    varianceAmount: number;
    operatorId: string;
    timestamp?: string;
  }
): { updatedState: DailyClosingState; success: boolean; error?: string } {
  if (currentState.isLocked) {
    return {
      updatedState: currentState,
      success: false,
      error: `이미 마감 잠금된 일자입니다 (잠금시각: ${currentState.lockedAt})`,
    };
  }

  return {
    updatedState: {
      ...currentState,
      isLocked: true,
      lockedAt: params.timestamp ?? new Date().toISOString(),
      lockedBy: params.operatorId,
      countedCash: params.countedCash,
      varianceAmount: params.varianceAmount,
    },
    success: true,
  };
}
