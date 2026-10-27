import assert from 'node:assert/strict';
import {
  validateEquityRatios,
  computeProfitDistribution,
  type EquityPartner,
} from './profitShareEngine';

function run() {
  const partners: EquityPartner[] = [
    { partner_id: 'p1', partner_name: '김대표', equity_ratio_percent: 60 },
    { partner_id: 'p2', partner_name: '이부원장', equity_ratio_percent: 40 },
  ];

  // 1. 지분율 검증 (60 + 40 = 100%)
  assert.equal(validateEquityRatios(partners).isValid, true);
  assert.equal(
    validateEquityRatios([
      { partner_id: 'p1', partner_name: 'A', equity_ratio_percent: 60 },
      { partner_id: 'p2', partner_name: 'B', equity_ratio_percent: 30 },
    ]).isValid,
    false // 90% 불합격
  );

  // 2. 손익 분배 계산
  // 매출 30,000,000원 - 비용 10,000,000원 = 순이익 20,000,000원
  // 유보금 10% = 2,000,000원
  // 배당 대상 = 18,000,000원
  // p1 (60%): 10,800,000원
  // p2 (40%): 7,200,000원
  const res = computeProfitDistribution(30000000, 10000000, 10, partners);
  assert.equal(res.netProfit, 20000000);
  assert.equal(res.reserveAmount, 2000000);
  assert.equal(res.distributableProfit, 18000000);
  assert.equal(res.distributions[0].dividend_amount, 10800000);
  assert.equal(res.distributions[1].dividend_amount, 7200000);

  // 3. 적자 발생 시 배당금 0원
  const lossRes = computeProfitDistribution(10000000, 15000000, 10, partners);
  assert.equal(lossRes.netProfit, -5000000);
  assert.equal(lossRes.distributableProfit, 0);
  assert.equal(lossRes.distributions[0].dividend_amount, 0);

  console.log('profitShareEngine.test.ts: ok');
}

run();
