import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * 복합 결제 (Split Payment) 순수 계산 유틸리티
 */
export function computeSplitAmounts(params: {
  payable: number;
  splitCashInput: string;
  splitReceivedInput?: string;
}) {
  const payable = Math.max(0, params.payable);
  const rawCash = Number(params.splitCashInput.replace(/[^\d]/g, ''));
  const cashAmount = Number.isFinite(rawCash) && rawCash > 0 ? Math.min(rawCash, payable) : 0;
  const cardAmount = Math.max(0, payable - cashAmount);

  let changeAmount = 0;
  let isShortage = false;
  let shortageAmount = 0;

  if (params.splitReceivedInput) {
    const rawReceived = Number(params.splitReceivedInput.replace(/[^\d]/g, ''));
    if (Number.isFinite(rawReceived) && rawReceived > 0) {
      const diff = rawReceived - cashAmount;
      if (diff >= 0) {
        changeAmount = diff;
      } else {
        isShortage = true;
        shortageAmount = Math.abs(diff);
      }
    }
  }

  return {
    payable,
    cashAmount,
    cardAmount,
    changeAmount,
    isShortage,
    shortageAmount,
  };
}

describe('Retail POS 복합 결제 (Split Payment) 계산 엔진', () => {
  it('현금 10,000원 입력 시 잔여액은 카드 결제액으로 정확히 자동 계산된다', () => {
    const result = computeSplitAmounts({
      payable: 25400,
      splitCashInput: '10000',
    });

    assert.equal(result.cashAmount, 10000);
    assert.equal(result.cardAmount, 15400);
    assert.equal(result.cashAmount + result.cardAmount, 25400);
  });

  it('현금 금액에 콤마가 포함되어도(10,000) 정상 파싱된다', () => {
    const result = computeSplitAmounts({
      payable: 50000,
      splitCashInput: '20,000',
    });

    assert.equal(result.cashAmount, 20000);
    assert.equal(result.cardAmount, 30000);
  });

  it('현금 입력이 총 결제액보다 클 경우, 총액까지만 현금으로 제한되고 카드는 0원이 된다', () => {
    const result = computeSplitAmounts({
      payable: 15000,
      splitCashInput: '20000',
    });

    assert.equal(result.cashAmount, 15000);
    assert.equal(result.cardAmount, 0);
  });

  it('현금 수납액에 대해 손님이 지폐를 넉넉히 냈을 때 거스름돈이 정확히 계산된다', () => {
    // 25,400원 중 현금 10,000원 + 카드 15,400원 결제 상황에서 손님이 5만원권을 냄
    const result = computeSplitAmounts({
      payable: 25400,
      splitCashInput: '10000',
      splitReceivedInput: '50000',
    });

    assert.equal(result.cashAmount, 10000);
    assert.equal(result.cardAmount, 15400);
    assert.equal(result.changeAmount, 40000); // 50,000 - 10,000 = 40,000
    assert.equal(result.isShortage, false);
  });

  it('현금 수납액보다 적은 지폐를 냈을 때 부족액을 정확히 감지한다', () => {
    // 현금 10,000원 받아야 하는데 5,000원만 냄
    const result = computeSplitAmounts({
      payable: 25400,
      splitCashInput: '10000',
      splitReceivedInput: '5000',
    });

    assert.equal(result.isShortage, true);
    assert.equal(result.shortageAmount, 5000);
  });
});
