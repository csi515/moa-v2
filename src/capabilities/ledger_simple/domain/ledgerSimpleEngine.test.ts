import assert from 'node:assert/strict';
import {
  aggregateDailyLedger,
  calculateCashVariance,
  lockDailyClosing,
  type LedgerEntry,
  type DailyClosingState,
} from './ledgerSimpleEngine';

function run() {
  const entries: LedgerEntry[] = [
    {
      id: 'e-1',
      type: 'INCOME',
      method: 'CASH',
      amount: 50000,
      description: '회원 가입 현금 결제',
      timestamp: '2026-06-01T10:00:00Z',
    },
    {
      id: 'e-2',
      type: 'INCOME',
      method: 'TRANSFER',
      amount: 150000,
      description: '계좌이체 수납',
      timestamp: '2026-06-01T11:00:00Z',
    },
    {
      id: 'e-3',
      type: 'EXPENSE',
      method: 'CASH',
      amount: 10000,
      description: '매장 청소용품 현금 지출',
      timestamp: '2026-06-01T14:00:00Z',
    },
  ];

  // 1. 수납액 결제수단별 합산
  const summary = aggregateDailyLedger(entries);
  assert.equal(summary.cashIncome, 50000);
  assert.equal(summary.cashExpense, 10000);
  assert.equal(summary.transferIncome, 150000);
  assert.equal(summary.totalIncome, 200000);
  assert.equal(summary.totalExpense, 10000);
  assert.equal(summary.netRevenue, 190000);

  // 2. 현금 시재 오차 대조 (기초 100,000원 + 현금수입 50,000 - 현금지출 10,000 = 기대 140,000원)
  // 2-1. 완벽 일치
  const matchVar = calculateCashVariance({
    openingCash: 100000,
    cashIncome: 50000,
    cashExpense: 10000,
    countedCash: 140000,
  });
  assert.equal(matchVar.expectedCash, 140000);
  assert.equal(matchVar.varianceAmount, 0);
  assert.equal(matchVar.status, 'MATCHED');

  // 2-2. 5,000원 부족 (SHORTAGE)
  const shortVar = calculateCashVariance({
    openingCash: 100000,
    cashIncome: 50000,
    cashExpense: 10000,
    countedCash: 135000,
  });
  assert.equal(shortVar.varianceAmount, -5000);
  assert.equal(shortVar.status, 'SHORTAGE');

  // 3. 일일 마감 잠금 판정
  const initialClosing: DailyClosingState = {
    date: '2026-06-01',
    isLocked: false,
    countedCash: 0,
    varianceAmount: 0,
  };

  const locked = lockDailyClosing(initialClosing, {
    countedCash: 140000,
    varianceAmount: 0,
    operatorId: 'manager-1',
    timestamp: '2026-06-01T23:00:00Z',
  });
  assert.equal(locked.success, true);
  assert.equal(locked.updatedState.isLocked, true);
  assert.equal(locked.updatedState.lockedBy, 'manager-1');

  // 중복 잠금 시도 방어
  const reLock = lockDailyClosing(locked.updatedState, {
    countedCash: 140000,
    varianceAmount: 0,
    operatorId: 'manager-2',
  });
  assert.equal(reLock.success, false);

  console.log('ledgerSimpleEngine.test.ts: ok');
}

run();
