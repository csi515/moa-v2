import assert from 'node:assert/strict';
import {
  computeMonthlySubleaseSettlement,
  validateContractDates,
  type SubleaseContractRecord,
} from './subleaseEngine';

function run() {
  const baseContract: SubleaseContractRecord = {
    id: 'sub-1',
    tenant_id: 't-1',
    subtenant_name: '루미네일',
    space_description: '샵인샵 1호존',
    fee_type: 'FIXED_RENT',
    deposit_amount: 5000000,
    fixed_monthly_rent: 700000,
    revenue_share_percent: 15,
    utility_fixed_fee: 100000,
    contract_start: '2026-01-01',
    contract_end: '2026-12-31',
    is_active: true,
  };

  // 1. 고정 월세 정산 (매출 무관)
  const fixedRes = computeMonthlySubleaseSettlement(baseContract, 5000000);
  assert.equal(fixedRes.baseRent, 700000);
  assert.equal(fixedRes.commissionFee, 0);
  assert.equal(fixedRes.utilityFee, 100000);
  assert.equal(fixedRes.totalSettlementAmount, 800000);

  // 2. 순수 매출 수수료 정산 (15%)
  const revShareContract: SubleaseContractRecord = { ...baseContract, fee_type: 'REVENUE_SHARE' };
  const revRes = computeMonthlySubleaseSettlement(revShareContract, 10000000); // 1,000만원의 15% = 150만원
  assert.equal(revRes.commissionFee, 1500000);
  assert.equal(revRes.totalSettlementAmount, 1600000); // 150만 + 공과금 10만

  // 3. 날짜 검증
  assert.equal(validateContractDates('2026-01-01', '2026-12-31').isValid, true);
  assert.equal(validateContractDates('2026-12-31', '2026-01-01').isValid, false);

  console.log('subleaseEngine.test.ts: ok');
}

run();
