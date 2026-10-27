import assert from 'node:assert/strict';
import {
  calculateWithholdingTax,
  validatePaymentInput,
} from './taxWithholdingEngine';

function run() {
  // 1. 3.3% 원천징수 계산 (세전 3,000,000원)
  // 소득세: 3,000,000 * 0.03 = 90,000원
  // 지방세: 90,000 * 0.1 = 9,000원
  // 총세액: 99,000원
  // 실지급액: 2,901,000원
  const res1 = calculateWithholdingTax(3000000);
  assert.equal(res1.incomeTax, 90000);
  assert.equal(res1.localTax, 9000);
  assert.equal(res1.totalTax, 99000);
  assert.equal(res1.netPay, 2901000);

  // 2. 단수 절사 검증 (세전 1,234,567원)
  // 소득세: 1,234,567 * 0.03 = 37,037.01 -> 37,030원
  // 지방세: 37,030 * 0.1 = 3,703 -> 3,700원
  // 총세액: 40,730원
  const res2 = calculateWithholdingTax(1234567);
  assert.equal(res2.incomeTax, 37030);
  assert.equal(res2.localTax, 3700);
  assert.equal(res2.totalTax, 40730);
  assert.equal(res2.netPay, 1234567 - 40730);

  // 3. 유효성 검증
  assert.equal(validatePaymentInput('김강사', 2500000, '2026-10').isValid, true);
  assert.equal(validatePaymentInput('', 2500000, '2026-10').isValid, false);
  assert.equal(validatePaymentInput('김강사', 0, '2026-10').isValid, false);

  console.log('taxWithholdingEngine.test.ts: ok');
}

run();
