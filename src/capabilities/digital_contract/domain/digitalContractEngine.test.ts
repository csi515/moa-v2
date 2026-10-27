import {
  SignedContract,
  calculateRefundEstimate,
  evaluateContractStatus,
  summarizeContracts,
  canTransitionContractStatus,
  calculateKftcStandardRefund,
  getExpiringContractsForRenewalNotification,
} from './digitalContractEngine';

function runTests() {
  console.log('--- Testing digitalContractEngine ---');

  // Test 1: 공정위 표준약관 기반 PT 계약 해지 환불금 계산 (총액 100만원, 20회 중 5회 소진, 위약금 10%)
  const ptContract: SignedContract = {
    id: 'ctr-1',
    contractNumber: 'CTR-202610-001',
    templateType: 'personal_training',
    title: '1:1 VIP 퍼스널 트레이닝 20회 계약서',
    customerName: '김철수',
    customerPhone: '010-1234-5678',
    totalContractAmount: 1000000,
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    totalSessionsOrDays: 20,
    usedSessionsOrDays: 5,
    signedAt: '2026-10-01T10:00:00Z',
    status: 'ACTIVE',
  };

  const refund = calculateRefundEstimate(ptContract, 5, 10);
  // 1회 단가: 1,000,000 / 20 = 50,000원
  // 5회 소진액: 250,000원
  // 위약금 (10%): 100,000원
  // 환불 예정액: 1,000,000 - 250,000 - 100,000 = 650,000원
  if (refund.usedAmount !== 250000) {
    throw new Error(`Expected used amount 250,000, got ${refund.usedAmount}`);
  }
  if (refund.penaltyAmount !== 100000) {
    throw new Error(`Expected penalty 100,000, got ${refund.penaltyAmount}`);
  }
  if (refund.refundableAmount !== 650000) {
    throw new Error(`Expected refund 650,000, got ${refund.refundableAmount}`);
  }
  console.log('✅ Test 1 passed: Fair Trade Commission standard refund calculation');

  // Test 2: 계약 상태 평가 (만료일 경과 및 세션 모두 소진)
  const expiredDateContract: SignedContract = {
    ...ptContract,
    endDate: '2026-10-10', // 2026-10-14 기준 경과
  };
  if (evaluateContractStatus(expiredDateContract, '2026-10-14') !== 'EXPIRED') {
    throw new Error('Expected contract to be EXPIRED due to end date');
  }

  const fullyUsedContract: SignedContract = {
    ...ptContract,
    usedSessionsOrDays: 20, // 20회 모두 소진
  };
  if (evaluateContractStatus(fullyUsedContract, '2026-10-05') !== 'EXPIRED') {
    throw new Error('Expected contract to be EXPIRED due to full usage');
  }
  console.log('✅ Test 2 passed: Contract status evaluation and expiry check');

  // Test 3: 전체 계약서 아카이브 통계 요약
  const summary = summarizeContracts([ptContract, expiredDateContract], '2026-10-14');
  if (summary.totalContractCount !== 2) {
    throw new Error(`Expected 2 contracts, got ${summary.totalContractCount}`);
  }
  if (summary.activeCount !== 1) {
    throw new Error(`Expected 1 active contract, got ${summary.activeCount}`);
  }
  if (summary.expiredCount !== 1) {
    throw new Error(`Expected 1 expired contract, got ${summary.expiredCount}`);
  }
  if (summary.totalContractValue !== 2000000) {
    throw new Error(`Expected total value 2,000,000, got ${summary.totalContractValue}`);
  }
  console.log('✅ Test 3 passed: Contract archive summary metrics');

  // Test 4: 계약 라이프사이클 상태 전이 검증 (DRAFT -> PENDING_SIGN -> SIGNED -> TERMINATED)
  const t1 = canTransitionContractStatus('DRAFT', 'PENDING_SIGN');
  if (!t1.allowed) throw new Error('DRAFT -> PENDING_SIGN should be allowed');

  const t2 = canTransitionContractStatus('PENDING_SIGN', 'SIGNED');
  if (!t2.allowed) throw new Error('PENDING_SIGN -> SIGNED should be allowed');

  const t3 = canTransitionContractStatus('DRAFT', 'REFUNDED');
  if (t3.allowed) throw new Error('DRAFT -> REFUNDED should NOT be allowed');
  console.log('✅ Test 4 passed: Contract status lifecycle transition');

  // Test 5: 공정위 표준약관 개시 전 100% 환불 vs 개시 후 위약금 10% 공제 검증
  const beforeStart = calculateKftcStandardRefund({
    totalContractAmount: 1500000,
    totalSessionsOrDays: 30,
    usedSessionsOrDays: 0,
    isServiceStarted: false,
  });
  if (beforeStart.refundableAmount !== 1500000 || beforeStart.penaltyAmount !== 0) {
    throw new Error('Before service start must refund 100% without penalty');
  }

  const afterStart = calculateKftcStandardRefund({
    totalContractAmount: 1500000,
    totalSessionsOrDays: 30,
    usedSessionsOrDays: 6, // 6회 소진: 300,000원
    isServiceStarted: true,
  });
  // 총액 150만 - 이용 30만 - 위약금 10%(15만) = 1,050,000원
  if (afterStart.refundableAmount !== 1050000 || afterStart.penaltyAmount !== 150000) {
    throw new Error(`Expected 1,050,000 refundable and 150,000 penalty, got ${afterStart.refundableAmount}`);
  }
  console.log('✅ Test 5 passed: KFTC pre-service vs post-service refund rules');

  // Test 6: 갱신/만료 사전 D-Day 알림 연동 검증
  const renewalContracts: SignedContract[] = [
    { ...ptContract, id: 'c-d10', endDate: '2026-10-28' }, // refDate 2026-10-18 기준 10일 남음 -> D_14
    { ...ptContract, id: 'c-d25', endDate: '2026-11-12' }, // 25일 남음 -> D_30
    { ...ptContract, id: 'c-d50', endDate: '2026-12-10' }, // 53일 남음 -> 대상 아님
  ];
  const notiList = getExpiringContractsForRenewalNotification(renewalContracts, '2026-10-18');
  if (notiList.length !== 2) {
    throw new Error(`Expected 2 expiring targets, got ${notiList.length}`);
  }
  if (notiList[0].notificationType !== 'D_14' || notiList[1].notificationType !== 'D_30') {
    throw new Error('Notification target types mismatch');
  }
  console.log('✅ Test 6 passed: D-Day contract renewal notification triggers');

  console.log('🎉 All digitalContractEngine tests passed!');
}

runTests();
