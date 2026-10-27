import assert from 'node:assert/strict';
import {
  computeUtilityUsage,
  computeUtilityCost,
  getUtilityUnitLabel,
} from './utilityMeterEngine';

function run() {
  // 1. 검침 사용량 계산 (전월 1200, 당월 1450 -> 250 kWh)
  const usageRes = computeUtilityUsage(1200, 1450);
  assert.equal(usageRes.isValid, true);
  assert.equal(usageRes.usage, 250);

  // 2. 지침 역전 에러 방어
  const invalidRes = computeUtilityUsage(1500, 1450);
  assert.equal(invalidRes.isValid, false);

  // 3. 요금 계산 (250 kWh * 150원 + 기본료 5,000원 = 42,500원)
  const cost = computeUtilityCost(250, 150, 5000);
  assert.equal(cost, 42500);

  // 4. 단위 라벨
  assert.equal(getUtilityUnitLabel('ELECTRICITY'), 'kWh');
  assert.equal(getUtilityUnitLabel('WATER'), 'm³');

  console.log('utilityMeterEngine.test.ts: ok');
}

run();
