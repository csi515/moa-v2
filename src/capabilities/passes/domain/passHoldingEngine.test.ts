import assert from 'node:assert/strict';
import {
  calculateDaysBetween,
  addHoldingDaysToDate,
  calculateHoldingExtension,
  validateHoldingRequest,
  applyHolding,
  terminateHoldingEarly,
  type HoldablePass,
  type HoldingPolicy,
} from './passHoldingEngine';
import {
  validateFamilyPassDeduction,
  deductFamilyPass,
  aggregateFamilyUsageStats,
  type FamilyGroup,
  type SharedPass,
} from './familyPassSharing';

console.log('[test:pass-holding-and-family] starting test suite...');

// ============================================================================
// 1. passHoldingEngine 검증
// ============================================================================
{
  // 1-1. 날짜 및 일수 계산
  assert.equal(calculateDaysBetween('2026-07-01', '2026-07-07'), 7, '양편 포함 7일');
  assert.equal(calculateDaysBetween('2026-07-01', '2026-07-01'), 1, '당일 1일');
  assert.equal(addHoldingDaysToDate('2026-07-01', 7), '2026-07-08', '7일 가산');

  const extension = calculateHoldingExtension('2026-12-31', '2026-08-01', '2026-08-14');
  assert.equal(extension.extendedDays, 14, '14일 연장');
  assert.equal(extension.newEndDate, '2027-01-14', '만료일 자동 14일 연장');

  // 1-2. 홀딩 정책 검증
  const policy: HoldingPolicy = {
    maxHoldCountPerYear: 2,
    minHoldDays: 7,
    maxHoldDaysPerTime: 30,
    maxTotalHoldDays: 45,
    allowRetroactiveHold: false,
  };

  const samplePass: HoldablePass = {
    id: 'pass-p1',
    customerId: 'cust-1',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    remainingCount: 20,
    holdRecords: [],
  };

  // 최소 일수 미달 (3일) 차단
  const minCheck = validateHoldingRequest(
    samplePass,
    '2026-08-01',
    '2026-08-03',
    policy,
    '2026-07-01'
  );
  assert.equal(minCheck.valid, false);
  assert.equal(minCheck.reason, 'LESS_THAN_MIN_DAYS');

  // 1회 최대 일수 초과 (35일) 차단
  const maxCheck = validateHoldingRequest(
    samplePass,
    '2026-08-01',
    '2026-09-04',
    policy,
    '2026-07-01'
  );
  assert.equal(maxCheck.valid, false);
  assert.equal(maxCheck.reason, 'EXCEEDS_MAX_DAYS_PER_TIME');

  // 정상 홀딩 적용
  const hold1 = applyHolding(
    samplePass,
    '2026-08-01',
    '2026-08-14',
    '여름 휴가',
    policy,
    '2026-07-01'
  );
  assert.equal(hold1.success, true);
  assert.equal(hold1.updatedPass.endDate, '2027-01-14', '종료일 연장됨');
  assert.equal(hold1.updatedPass.holdRecords?.length, 1);
  assert.equal(hold1.updatedPass.holdRecords?.[0].status, 'SCHEDULED');

  // 중복 구간 신청 차단
  const overlapCheck = validateHoldingRequest(
    hold1.updatedPass,
    '2026-08-10',
    '2026-08-20',
    policy,
    '2026-07-01'
  );
  assert.equal(overlapCheck.valid, false);
  assert.equal(overlapCheck.reason, 'OVERLAPPING_HOLD_EXISTS');

  // 2차 홀딩 적용 (20일)
  const hold2 = applyHolding(
    hold1.updatedPass,
    '2026-10-01',
    '2026-10-20',
    '병원 입원',
    policy,
    '2026-07-01'
  );
  assert.equal(hold2.success, true);
  assert.equal(hold2.updatedPass.holdRecords?.length, 2);

  // 연간 횟수(2회) 초과로 3차 홀딩 차단
  const countExceedCheck = validateHoldingRequest(
    hold2.updatedPass,
    '2026-11-01',
    '2026-11-10',
    policy,
    '2026-07-01'
  );
  assert.equal(countExceedCheck.valid, false);
  assert.equal(countExceedCheck.reason, 'EXCEEDS_MAX_COUNT_PER_YEAR');

  // 조기 복귀(Early termination) 테스트
  const activeHoldPass: HoldablePass = {
    id: 'pass-active-hold',
    customerId: 'cust-2',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'PAUSED',
    remainingCount: 10,
    holdRecords: [
      {
        id: 'h-act-1',
        startDate: '2026-06-01',
        endDate: '2026-06-30', // 총 30일 예정
        days: 30,
        reason: '장기 출장',
        status: 'ACTIVE',
        appliedAt: '2026-06-01T00:00:00.000Z',
      },
    ],
  };

  // 6월 10일에 조기 복귀 (10일만 사용, 20일 반환)
  const earlyResume = terminateHoldingEarly(activeHoldPass, 'h-act-1', '2026-06-10');
  assert.equal(earlyResume.success, true);
  assert.equal(earlyResume.restoredDays, 20);
  assert.equal(earlyResume.updatedPass.status, 'ACTIVE');
  assert.equal(earlyResume.updatedPass.holdRecords?.[0].status, 'COMPLETED');
}
console.log('✓ 1. 수강권 홀딩 엔진 및 연장 정책 검증 통과');

// ============================================================================
// 2. familyPassSharing 검증
// ============================================================================
{
  const familyGroup: FamilyGroup = {
    groupId: 'fg-100',
    representativeCustomerId: 'parent-kim',
    groupName: '김철수·김영희 남매',
    members: [
      { memberId: 'child-1', name: '김철수', relationship: 'CHILD', isActive: true, dailyDeductionLimit: 1 },
      { memberId: 'child-2', name: '김영희', relationship: 'CHILD', isActive: true, dailyDeductionLimit: 2 },
      { memberId: 'child-inactive', name: '김휴학생', relationship: 'CHILD', isActive: false },
    ],
  };

  const sharedPass: SharedPass = {
    id: 'spass-1',
    primaryCustomerId: 'parent-kim',
    totalCount: 30,
    remainingCount: 3,
    startDate: '2026-03-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    sharedFamilyGroupId: 'fg-100',
  };

  // 2-1. 비활성 가족 구성원 차단
  const inactiveCheck = validateFamilyPassDeduction(
    sharedPass,
    familyGroup,
    'child-inactive',
    '2026-07-10',
    0
  );
  assert.equal(inactiveCheck.valid, false);
  assert.equal(inactiveCheck.reason, 'MEMBER_INACTIVE');

  // 2-2. 1일 차감 한도(1회) 초과 차단
  const limitCheck = validateFamilyPassDeduction(
    sharedPass,
    familyGroup,
    'child-1',
    '2026-07-10',
    1 // 이미 오늘 1회 썼음
  );
  assert.equal(limitCheck.valid, false);
  assert.equal(limitCheck.reason, 'DAILY_LIMIT_EXCEEDED');

  // 2-3. 첫째 아이(김철수) 정상 차감
  const deduct1 = deductFamilyPass(sharedPass, familyGroup, 'child-1', '2026-07-10', 0, '오전 레슨');
  assert.equal(deduct1.success, true);
  assert.equal(deduct1.updatedPass.remainingCount, 2);
  assert.equal(deduct1.usageEntry?.memberName, '김철수');

  // 2-4. 둘째 아이(김영희) 정상 차감
  const deduct2 = deductFamilyPass(deduct1.updatedPass, familyGroup, 'child-2', '2026-07-10', 0, '오후 레슨');
  assert.equal(deduct2.success, true);
  assert.equal(deduct2.updatedPass.remainingCount, 1);
  assert.equal(deduct2.usageEntry?.memberName, '김영희');

  // 2-5. 마지막 1회 차감 -> 소진(EXHAUSTED)
  const deduct3 = deductFamilyPass(deduct2.updatedPass, familyGroup, 'child-2', '2026-07-10', 1, '보충 연습');
  assert.equal(deduct3.success, true);
  assert.equal(deduct3.updatedPass.remainingCount, 0);
  assert.equal(deduct3.updatedPass.status, 'EXHAUSTED');

  // 2-6. 소진 후 추가 차감 차단
  const deduct4 = deductFamilyPass(deduct3.updatedPass, familyGroup, 'child-1', '2026-07-11', 0);
  assert.equal(deduct4.success, false);

  // 2-7. 가족 사용 통계 집계
  const stats = aggregateFamilyUsageStats(
    [deduct1.usageEntry!, deduct2.usageEntry!, deduct3.usageEntry!],
    familyGroup
  );
  assert.equal(stats['child-1'].usedCount, 1);
  assert.equal(stats['child-2'].usedCount, 2);
  assert.equal(stats['child-1'].memberName, '김철수');
  assert.equal(stats['child-2'].memberName, '김영희');
}
console.log('✓ 2. 패밀리 N:1 공유 풀 차감 및 통계 집계 검증 통과');

console.log('[test:pass-holding-and-family] ALL TESTS PASSED! (100%)');
