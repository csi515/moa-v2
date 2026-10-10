/**
 * [Phase 2] Capability Pack Grouping & Financial Isolation Invariant Test
 *
 * Invariants:
 * 1. 도메인 기능 팩 (Capability Pack):
 *    - 모든 업종(피아노, 피부, 헬스, 어린이집, 필라테스, 소매, 목욕, Generic)은
 *      수십 개의 개별 불리언 플래그 대신 5대 도메인 기능 팩
 *      (facility, billing, attendance, portal, booking)을 일관되게 제공한다.
 * 2. 금융/정산 코어 로직 격리 (Financial Isolation):
 *    - 강사 정산, 수납, 회차권 차감 등 금액 계산 및 트랜잭션 로직은
 *      플러그인 분기에 의해 변조되지 않는 불변(Immutable) 코어 비즈니스 로직이다.
 *    - 플러그인은 오직 표시 라벨(명칭), 과목 카테고리 태그, UI 노출 메타데이터만 제공한다.
 *
 * 실행: npx tsx src/core/invariants/capabilityPacksAndFinanceIsolation.invariant.test.ts
 */
import assert from 'node:assert/strict';
import { IndustryAdapter } from '@/core/industry/IndustryAdapter';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import { INDUSTRY_IDS, type IndustryType } from '@/core/industry/types';
import { computePayrollAmount, summarizePayrollRows } from '@/capabilities/billing/finance/teacherPayroll/calc';
import { applyConsumeToPassList, applyRefundToPassList } from '@/core/schedules/sessionPassRules';
import type { SessionPass } from '@/core/types/schedule';

installIndustryPlugins([
  {
    id: 'piano',
    theme: 'indigo',
    feeLabel: '수강료',
    customerLabel: '원생',
    placeLabel: '학원',
    ownerLabel: '원장',
    usesClassBasedSchedule: true,
    supportsDeposit: false,
    showsTextbooksLink: true,
    showsMakeupList: true,
    showsPracticeRoomTab: true,
    showsCustomerPoints: false,
    includesLinkedBillingIncome: true,
    getPayrollExpenseCategory: () => 'teacher_salary',
  } as any,
  {
    id: 'retail',
    feeLabel: '이용료',
    customerLabel: '고객',
    placeLabel: '매장',
    ownerLabel: '대표',
    showsCustomerPoints: true,
    showsPracticeRoomTab: false,
    showsMakeupList: false,
  } as any,
  {
    id: 'daycare',
    feeLabel: '보육료',
    customerLabel: '원아',
    placeLabel: '어린이집',
    ownerLabel: '원장',
    attendanceCopy: { recordNoun: '등하원' },
  } as any,
  {
    id: 'skin_clinic',
    feeLabel: '이용료',
    customerLabel: '고객',
    placeLabel: '클리닉',
    ownerLabel: '원장',
    supportsDeposit: true,
    getPayrollExpenseCategory: () => 'instructor_fee',
  } as any,
]);

// ============================================================================
// 1. 도메인 기능 팩 (Capability Pack) 정합성 검증
// ============================================================================

const TEST_INDUSTRIES: (IndustryType | 'generic')[] = [
  ...INDUSTRY_IDS,
  'generic',
];

for (const industry of TEST_INDUSTRIES) {
  const facility = IndustryAdapter.getFacilityConfig(industry);
  const billing = IndustryAdapter.getBillingConfig(industry);
  const attendance = IndustryAdapter.getAttendanceConfig(industry);
  const portal = IndustryAdapter.getPortalConfig(industry);
  const manifest = IndustryAdapter.getPresetManifest(industry);

  // 1-1. Facility Capability Pack
  assert.equal(typeof facility.enabled, 'boolean', `${industry}: facility.enabled boolean`);
  assert.ok(facility.roomConfig, `${industry}: roomConfig must be present`);
  assert.equal(typeof facility.features?.practiceRoomBooking, 'boolean');

  // 1-2. Billing Capability Pack
  assert.equal(typeof billing.enabled, 'boolean', `${industry}: billing.enabled boolean`);
  assert.ok(billing.feeLabel, `${industry}: feeLabel must be defined`);
  assert.equal(typeof billing.supportsDeposit, 'boolean');
  assert.equal(typeof billing.payrollExpenseCategory, 'string');
  assert.equal(typeof billing.showsTextbooksLink, 'boolean');

  // 1-3. Attendance Capability Pack
  assert.equal(typeof attendance.enabled, 'boolean', `${industry}: attendance.enabled boolean`);
  assert.ok(['등하원', '출입', '출결'].includes(attendance.recordNoun ?? '출결'));
  assert.equal(typeof attendance.usesClassBasedSchedule, 'boolean');
  assert.ok(['atomic_rpc', 'none'].includes(attendance.passDeductionMode ?? 'none'));

  // 1-4. Portal Capability Pack
  assert.equal(typeof portal.enabled, 'boolean', `${industry}: portal.enabled boolean`);
  assert.ok(portal.portalRoleLabel, `${industry}: portalRoleLabel must be defined`);
  assert.equal(typeof portal.features?.showsMakeupList, 'boolean');
  assert.equal(typeof portal.features?.showsCustomerPoints, 'boolean');
  assert.equal(typeof portal.features?.showsPracticeRoomTab, 'boolean');

  // 1-5. Preset Manifest Assembly Parity
  if (industry !== 'generic') {
    assert.equal(manifest.id, industry, `${industry}: preset manifest id matches`);
  } else {
    assert.ok(manifest.id, `${industry}: preset manifest id exists`);
  }
  assert.ok(manifest.labels.customer, `${industry}: customer label in preset`);
  assert.ok(manifest.labels.fee, `${industry}: fee label in preset`);
  assert.equal(manifest.capabilities.facility?.enabled, facility.enabled);
  assert.equal(manifest.capabilities.billing?.enabled, billing.enabled);
  assert.equal(manifest.capabilities.billing?.feeLabel, billing.feeLabel);
  assert.equal(manifest.capabilities.billing?.payrollExpenseCategory, billing.payrollExpenseCategory);
  assert.equal(manifest.capabilities.attendance?.enabled, attendance.enabled);
  assert.equal(manifest.capabilities.attendance?.recordNoun, attendance.recordNoun);
  assert.equal(manifest.capabilities.portal?.enabled, portal.enabled);
  assert.deepEqual(manifest.capabilities.portal?.features, portal.features);
}

// 업종별 도메인 팩 특화 동작 불변식 검증
const pianoPortal = IndustryAdapter.getPortalConfig('piano');
assert.equal(pianoPortal.features?.showsPracticeRoomTab, true);
assert.equal(pianoPortal.features?.showsMakeupList, true);
assert.equal(pianoPortal.features?.showsCustomerPoints, false);

const retailPortal = IndustryAdapter.getPortalConfig('retail');
assert.equal(retailPortal.features?.showsCustomerPoints, true);
assert.equal(retailPortal.features?.showsPracticeRoomTab, false);
assert.equal(retailPortal.features?.showsMakeupList, false);

const daycareAttendance = IndustryAdapter.getAttendanceConfig('daycare');
assert.equal(daycareAttendance.recordNoun, '등하원');

const skinBilling = IndustryAdapter.getBillingConfig('skin_clinic');
assert.equal(skinBilling.supportsDeposit, true);
assert.equal(skinBilling.payrollExpenseCategory, 'instructor_fee');

const pianoBilling = IndustryAdapter.getBillingConfig('piano');
assert.equal(pianoBilling.showsTextbooksLink, true);
assert.equal(pianoBilling.displayLinkedIncomeOverview, true);
assert.equal(pianoBilling.payrollExpenseCategory, 'teacher_salary');

// ============================================================================
// 2. 금융/정산 코어 로직 격리 (Financial Invariant) 검증
// ============================================================================

// 2-1. 강사 정산 금액 계산 불변식 (시간제·출석제·월급제)
assert.equal(computePayrollAmount({ payType: 'hourly', quantity: 15, hourlyRate: 30000 }), 450000);
assert.equal(computePayrollAmount({ payType: 'hourly', quantity: 0, hourlyRate: 30000 }), 0);
assert.equal(computePayrollAmount({ payType: 'monthly', quantity: 1, salary: 2500000 }), 2500000);
assert.equal(computePayrollAmount({ payType: 'none', quantity: 10, hourlyRate: 50000 }), 0);

const totals = summarizePayrollRows([
  {
    teacherId: 't1',
    teacherName: '김강사',
    payType: 'hourly',
    rate: 30000,
    lessonCount: 10,
    quantity: 10,
    calculatedAmount: 300000,
    adjustmentAmount: 0,
    finalAmount: 300000,
    settlementStatus: 'pending',
  },
  {
    teacherId: 't2',
    teacherName: '이강사',
    payType: 'monthly',
    rate: 2000000,
    lessonCount: 0,
    quantity: 1,
    calculatedAmount: 2000000,
    adjustmentAmount: 50000,
    finalAmount: 2050000,
    settlementStatus: 'confirmed',
  },
]);
assert.equal(totals.teacherCount, 2);
assert.equal(totals.pendingAmount, 300000);
assert.equal(totals.pendingCount, 1);
assert.equal(totals.settledAmount, 2050000);
assert.equal(totals.settledCount, 1);

// 2-2. 회차권 차감 및 복구(환불) 코어 불변식
const initialPasses: SessionPass[] = [
  {
    id: 'pass-1',
    customerId: 'cust-1',
    totalSessions: 10,
    usedSessions: 8,
    status: 'active',
  },
  {
    id: 'pass-2',
    customerId: 'cust-1',
    totalSessions: 10,
    usedSessions: 10,
    status: 'exhausted',
  },
];

// 차감: 잔여 횟수가 남아있는 패스만 차감되며 잔여가 0이 되면 status='exhausted'로 전이
const consumed1 = applyConsumeToPassList(initialPasses, 'cust-1');
assert.ok(consumed1);
assert.equal(consumed1.passId, 'pass-1');
assert.equal(consumed1.list.find((p) => p.id === 'pass-1')?.usedSessions, 9);
assert.equal(consumed1.list.find((p) => p.id === 'pass-1')?.status, 'active');

const consumed2 = applyConsumeToPassList(consumed1.list, 'cust-1');
assert.ok(consumed2);
assert.equal(consumed2.passId, 'pass-1');
assert.equal(consumed2.list.find((p) => p.id === 'pass-1')?.usedSessions, 10);
assert.equal(consumed2.list.find((p) => p.id === 'pass-1')?.status, 'exhausted');

// 잔여 0 상태에서 추가 차감 시도 -> 실패 (잔여 부족)
const consumedFail = applyConsumeToPassList(consumed2.list, 'cust-1');
assert.equal(consumedFail, null);

// 복구(환불): 취소 시 잔여 횟수 증가 및 status='active'로 복구
const refunded = applyRefundToPassList(consumed2.list, 'pass-1');
assert.equal(refunded.ok, true);
assert.equal(refunded.list.find((p) => p.id === 'pass-1')?.usedSessions, 9);
assert.equal(refunded.list.find((p) => p.id === 'pass-1')?.status, 'active');

console.log('capabilityPacksAndFinanceIsolation.invariant.test.ts: OK');
