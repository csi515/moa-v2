import assert from 'node:assert/strict';
import {
  evaluatePassValidity,
  deductPassUsage,
  evaluateSharedPassValidity,
  deductSharedPassUsage,
  pausePass,
  resumePass,
  getPassRemainingDays,
  type PassDefinition,
} from './passesEngine';

function run() {
  const activeCountPass: PassDefinition = {
    id: 'pass-1',
    customerId: 'cust-1',
    passType: 'COUNT_BASED',
    status: 'ACTIVE',
    totalCount: 10,
    remainingCount: 2,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
  };

  // 1. 유효성 체크
  const validCheck = evaluatePassValidity(activeCountPass, '2026-06-01');
  assert.equal(validCheck.canUse, true);
  assert.equal(validCheck.status, 'ACTIVE');

  // 2. 사용 차감
  const use1 = deductPassUsage(activeCountPass, '2026-06-01');
  assert.equal(use1.success, true);
  assert.equal(use1.updatedPass.remainingCount, 1);
  assert.equal(use1.updatedPass.status, 'ACTIVE');

  // 3. 마지막 1회 차감 -> 소진
  const use2 = deductPassUsage(use1.updatedPass, '2026-06-02');
  assert.equal(use2.success, true);
  assert.equal(use2.updatedPass.remainingCount, 0);
  assert.equal(use2.updatedPass.status, 'EXHAUSTED');

  // 4. 소진 후 사용 시도 -> 실패
  const use3 = deductPassUsage(use2.updatedPass, '2026-06-03');
  assert.equal(use3.success, false);
  assert.equal(use3.error, 'NO_REMAINING_COUNT');

  // 5. 기간 만료 체크
  const expiredCheck = evaluatePassValidity(activeCountPass, '2027-01-01');
  assert.equal(expiredCheck.canUse, false);
  assert.equal(expiredCheck.reason, 'EXPIRED');

  // 6. 일시정지 패스
  const pausedPass: PassDefinition = { ...activeCountPass, status: 'PAUSED' };
  assert.equal(evaluatePassValidity(pausedPass, '2026-06-01').canUse, false);

  // 7. 패밀리 쉐어링 (Family Pool N:1 공유) 검증
  const familyPass: PassDefinition = {
    id: 'pass-family-1',
    customerId: 'parent-1', // 학부모(주 계약자)
    passType: 'COUNT_BASED',
    status: 'ACTIVE',
    totalCount: 20,
    remainingCount: 5,
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    sharedMemberIds: ['child-1', 'child-2'], // 자녀 1, 자녀 2
  };

  // 7-1. 미등록 제3자 요청 차단
  const strangerCheck = evaluateSharedPassValidity(familyPass, 'stranger-9', '2026-04-10');
  assert.equal(strangerCheck.canUse, false);
  assert.equal(strangerCheck.reason, 'NOT_AUTHORIZED_MEMBER');

  // 7-2. 자녀 1 차감 성공 및 개별 로그
  const child1Use = deductSharedPassUsage(familyPass, 'child-1', '2026-04-10', '피아노 연습실 사용');
  assert.equal(child1Use.success, true);
  assert.equal(child1Use.updatedPass.remainingCount, 4);
  assert.equal(child1Use.usageLog?.memberId, 'child-1');

  // 7-3. 자녀 2 차감 성공
  const child2Use = deductSharedPassUsage(child1Use.updatedPass, 'child-2', '2026-04-11', '피아노 레슨');
  assert.equal(child2Use.success, true);
  assert.equal(child2Use.updatedPass.remainingCount, 3);
  assert.equal(child2Use.usageLog?.memberId, 'child-2');

  // 8. 홀딩(일시정지) 및 재개 상태머신 (만료일 자동 연장) 검증
  const holdTargetPass: PassDefinition = {
    id: 'pass-hold-1',
    customerId: 'cust-hold',
    passType: 'PERIOD_BASED',
    status: 'ACTIVE',
    totalCount: 0,
    remainingCount: 0,
    startDate: '2026-05-01',
    endDate: '2026-07-31', // 원래 만료일 7월 31일
  };

  // 8-1. 3주간(21일) 정지
  const paused = pausePass(holdTargetPass, '2026-06-01', '어깨 부상 치료');
  assert.equal(paused.success, true);
  assert.equal(paused.updatedPass.status, 'PAUSED');
  assert.equal(paused.updatedPass.pausedAt, '2026-06-01');

  // 정지 상태에서는 사용 불가
  assert.equal(evaluatePassValidity(paused.updatedPass, '2026-06-15').canUse, false);

  // 8-2. 2026-06-22(21일 후) 재개 -> endDate가 21일 연장되어 2026-08-21이 되어야 함
  const resumed = resumePass(paused.updatedPass, '2026-06-22');
  assert.equal(resumed.success, true);
  assert.equal(resumed.updatedPass.status, 'ACTIVE');
  assert.equal(resumed.extendedDays, 21);
  assert.equal(resumed.updatedPass.endDate, '2026-08-21');
  assert.equal(resumed.updatedPass.holdHistory?.length, 1);
  assert.equal(resumed.updatedPass.holdHistory?.[0].daysExtended, 21);

  // 연장된 기간(2026-08-10)에 유효하게 사용 가능
  assert.equal(evaluatePassValidity(resumed.updatedPass, '2026-08-10').canUse, true);
  assert.equal(getPassRemainingDays({ endDate: '2026-08-21' }, '2026-08-21'), 0);
  assert.equal(getPassRemainingDays({ endDate: '2026-08-21' }, '2026-08-20'), 1);
  assert.equal(getPassRemainingDays({ endDate: '2026-08-21' }, '2026-08-22'), -1);

  console.log('passesEngine.test.ts: ok');
}

run();

