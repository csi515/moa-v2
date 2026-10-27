import assert from 'node:assert';
import {
  calculateFamilyDiscountRate,
  calculateFamilyBilling,
  bindMemberToFamilyGroup,
  depositSharedFamilyCredit,
  deductSharedFamilyCredit,
  grantReferralReward,
  FamilyGroup,
  FamilyMember,
  ReferralRecord,
} from './membershipReferralTreeEngine';

console.log('--- Testing membershipReferralTreeEngine ---');

// Test 1: Sibling discount rate calculation
assert.strictEqual(calculateFamilyDiscountRate(1, 10), 0, '1 member should have 0% discount');
assert.strictEqual(calculateFamilyDiscountRate(2, 10), 10, '2 siblings should have 10% discount');
assert.strictEqual(calculateFamilyDiscountRate(3, 10), 15, '3+ siblings should have 15% discount');
console.log('✅ Test 1 passed: Family discount rate tiers');

// Test 2: Family billing and shared credit deduction
const testGroup: FamilyGroup = {
  groupId: 'fam-101',
  familyName: '김민준 & 김서아 가족',
  representativeMemberId: 'm-kim-parent',
  representativeName: '김철수(부)',
  members: [
    {
      memberId: 'm-child-1',
      name: '김민준',
      relationship: 'child',
      enrolledCoursesCount: 2,
      monthlyTuition: 200000,
    },
    {
      memberId: 'm-child-2',
      name: '김서아',
      relationship: 'child',
      enrolledCoursesCount: 1,
      monthlyTuition: 150000,
    },
  ],
  sharedCreditBalance: 100000,
  createdAt: '2026-03-01T09:00:00Z',
};

const billing = calculateFamilyBilling(testGroup, 10, true);
// Total: 350,000 KRW
// 2 children -> 10% discount: 35,000 KRW
// Net payable: 315,000 KRW
// Shared credit: 100,000 KRW applied
// Out of pocket: 215,000 KRW
// Remaining credit: 0 KRW
assert.strictEqual(billing.totalOriginalTuition, 350000);
assert.strictEqual(billing.discountRatePercent, 10);
assert.strictEqual(billing.discountAmount, 35000);
assert.strictEqual(billing.netPayableAmount, 315000);
assert.strictEqual(billing.coveredBySharedCredit, 100000);
assert.strictEqual(billing.finalOutOfPocketAmount, 215000);
assert.strictEqual(billing.remainingSharedCredit, 0);
console.log('✅ Test 2 passed: Family billing and shared credit offset');

// Test 3: Bind new member to family
const newMember: FamilyMember = {
  memberId: 'm-child-3',
  name: '김하은',
  relationship: 'child',
  enrolledCoursesCount: 1,
  monthlyTuition: 120000,
};

const updatedGroup = bindMemberToFamilyGroup(testGroup, newMember);
assert.strictEqual(updatedGroup.members.length, 3);
const billing3 = calculateFamilyBilling(updatedGroup, 10, false);
// 3 members -> 15% discount
assert.strictEqual(billing3.discountRatePercent, 15);
console.log('✅ Test 3 passed: Member binding and tier progression');

// Test 4: Credit deposit and deduction
const withMoreCredit = depositSharedFamilyCredit(testGroup, 50000);
assert.strictEqual(withMoreCredit.sharedCreditBalance, 150000);

const deductRes = deductSharedFamilyCredit(withMoreCredit, 70000);
assert.strictEqual(deductRes.success, true);
assert.strictEqual(deductRes.actualDeducted, 70000);
assert.strictEqual(deductRes.updatedGroup.sharedCreditBalance, 80000);

const failDeduct = deductSharedFamilyCredit(deductRes.updatedGroup, 999999);
assert.strictEqual(failDeduct.success, false);
console.log('✅ Test 4 passed: Shared family credit deposit & safe deduction');

// Test 5: Referral reward granting
const referral: ReferralRecord = {
  referralId: 'ref-001',
  referrerMemberId: 'm-001',
  referrerName: '이영희',
  refereeMemberId: 'm-002',
  refereeName: '박지성',
  registeredDate: '2026-03-10',
  rewardType: 'credit_cash',
  rewardValue: 30000,
  status: 'pending',
};

const rewarded = grantReferralReward(referral);
assert.strictEqual(rewarded.status, 'rewarded');
console.log('✅ Test 5 passed: Referral reward status grant');

console.log('🎉 All membershipReferralTreeEngine tests passed!');
