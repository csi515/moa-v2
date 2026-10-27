import assert from 'node:assert/strict';
import {
  calculateGrossProfit,
  calculateTotalOpex,
  calculateOperatingIncome,
  calculateOperatingMargin,
  predictNextMonthCash,
  type OperatingExpenses,
} from './simplePlCashflowEngine';

function run() {
  const opex: OperatingExpenses = {
    labor: 4000000,
    rent: 1500000,
    utilities: 300000,
    marketing: 200000,
    others: 100000,
  };

  // 1. calculateGrossProfit
  // 매출 10,000,000 - 원가 2,000,000 = 8,000,000
  const grossProfit = calculateGrossProfit(10000000, 2000000);
  assert.equal(grossProfit, 8000000);

  // 2. calculateTotalOpex
  // 4,000,000 + 1,500,000 + 300,000 + 200,000 + 100,000 = 6,100,000
  const totalOpex = calculateTotalOpex(opex);
  assert.equal(totalOpex, 6100000);

  // 3. calculateOperatingIncome
  // 8,000,000 - 6,100,000 = 1,900,000
  const opIncome = calculateOperatingIncome(10000000, 2000000, opex);
  assert.equal(opIncome, 1900000);

  // 4. calculateOperatingMargin
  // 1,900,000 / 10,000,000 * 100 = 19.0%
  const margin = calculateOperatingMargin(10000000, opIncome);
  assert.equal(margin, 19.0);

  // 5. predictNextMonthCash (안전 유보액: 5,000,000)
  // 잔고 3,000,000 + 유입 8,000,000 - 유출 7,000,000 = 예상 잔고 4,000,000
  // 안전 기준(5,000,000) 미달 -> 위험 true, 부족액 1,000,000
  const forecast = predictNextMonthCash(3000000, 8000000, 7000000, 5000000);
  assert.equal(forecast.projectedBalance, 4000000);
  assert.equal(forecast.isDeficitRisk, true);
  assert.equal(forecast.shortfallAmount, 1000000);

  console.log('simplePlCashflowEngine tests passed!');
}

run();
