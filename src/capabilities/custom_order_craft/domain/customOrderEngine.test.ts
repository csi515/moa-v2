import assert from 'node:assert/strict';
import {
  computeOrderPayments,
  advanceCraftStage,
  validateCustomOrderInput,
} from './customOrderEngine';

function run() {
  // 1. 계약금 및 잔금 계산 (총 80,000원, 착수금 50%)
  const pay = computeOrderPayments(80000, 50);
  assert.equal(pay.requiredDownPayment, 40000);
  assert.equal(pay.balanceDue, 40000);

  // 2. 공정 단계 전이
  assert.equal(advanceCraftStage('ORDER_RECEIVED').nextStage, 'IN_PRODUCTION');
  assert.equal(advanceCraftStage('IN_PRODUCTION').nextStage, 'QUALITY_INSPECTED');
  assert.equal(advanceCraftStage('QUALITY_INSPECTED').nextStage, 'READY_FOR_PICKUP');
  assert.equal(advanceCraftStage('READY_FOR_PICKUP').nextStage, 'FULFILLED');
  assert.equal(advanceCraftStage('READY_FOR_PICKUP').isComplete, true);

  // 3. 유효성 검증
  assert.equal(validateCustomOrderInput('김주문', '수제 가죽 지갑', 120000).isValid, true);
  assert.equal(validateCustomOrderInput('', '지갑', 120000).isValid, false);
  assert.equal(validateCustomOrderInput('김주문', '', 120000).isValid, false);

  console.log('customOrderEngine.test.ts: ok');
}

run();
