import assert from 'node:assert';
import {
  calculatePackageRealization,
  consumePackageUnits,
  calculatePackageCancellationRefund,
  summarizeStoreLiabilityPortfolio,
  SoldPackageContract,
} from './packageSplitBillingEngine';

console.log('--- Testing packageSplitBillingEngine ---');

// Test 1: Combo package revenue recognition and unearned liability
const comboPackage: SoldPackageContract = {
  id: 'pkg_1',
  customerName: '이진욱',
  packageName: '헬스 3개월 + PT 10회 콤보',
  totalPackagePrice: 1000000,
  soldAt: '2026-10-01T00:00:00Z',
  status: 'active',
  subItems: [
    {
      id: 'sub_gym',
      name: '헬스 3개월',
      type: 'period_days',
      allocatedPrice: 300000,
      totalUnits: 90,
      consumedUnits: 30, // 30 days passed -> 100,000 recognized
    },
    {
      id: 'sub_pt',
      name: '1:1 PT 10회',
      type: 'session',
      allocatedPrice: 700000,
      totalUnits: 10,
      consumedUnits: 4, // 4 sessions consumed -> 280,000 recognized
    },
  ],
};

const m1 = calculatePackageRealization(comboPackage);
assert.strictEqual(m1.totalAllocatedPrice, 1000000);
assert.strictEqual(m1.totalRecognizedRevenue, 380000); // 100,000 + 280,000 = 380,000
assert.strictEqual(m1.remainingUnearnedLiability, 620000); // 1,000,000 - 380,000 = 620,000
assert.strictEqual(m1.realizationRatePercent, 38);
console.log('✅ Test 1 passed: Package unearned liability and revenue split realization');

// Test 2: Unit consumption
const updatedPkg = consumePackageUnits(comboPackage, 'sub_pt', 1);
const ptItem = updatedPkg.subItems.find((i) => i.id === 'sub_pt');
assert.strictEqual(ptItem?.consumedUnits, 5);

const m2 = calculatePackageRealization(updatedPkg);
assert.strictEqual(m2.totalRecognizedRevenue, 450000); // 100,000 + 350,000 = 450,000
assert.strictEqual(m2.remainingUnearnedLiability, 550000);
console.log('✅ Test 2 passed: Session unit consumption advances revenue');

// Test 3: Mid-term cancellation refund with 10% penalty
const refundCalc = calculatePackageCancellationRefund(updatedPkg, 0.1);
assert.strictEqual(refundCalc.totalPaid, 1000000);
assert.strictEqual(refundCalc.penaltyFee, 100000); // 10% of 1M
assert.strictEqual(refundCalc.unearnedLiability, 550000);
assert.strictEqual(refundCalc.refundAmount, 450000); // 550,000 - 100,000 = 450,000
console.log('✅ Test 3 passed: Fair Trade cancellation refund calculation');

// Test 4: Store portfolio summary
const storeSummary = summarizeStoreLiabilityPortfolio([comboPackage]);
assert.strictEqual(storeSummary.totalSoldVolume, 1000000);
assert.strictEqual(storeSummary.totalCurrentUnearnedLiability, 620000);
console.log('✅ Test 4 passed: Store-wide liability portfolio summary');

console.log('🎉 All packageSplitBillingEngine tests passed!');
