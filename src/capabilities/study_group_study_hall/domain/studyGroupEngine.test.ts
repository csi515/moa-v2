import assert from 'node:assert/strict';
import {
  type StudyGroup,
  calculateMemberSettlement,
  settleStudyGroup,
  calculateGroupTotalPenalty,
} from './studyGroupEngine';

function run() {
  // 1. calculateMemberSettlement
  // 기준: 80%, 보증금: 50,000원
  // 케이스 A: 85% 출석 (기준 통과 -> 페널티 0, 전액 환급)
  const caseA = calculateMemberSettlement(50000, 85, 80);
  assert.equal(caseA.penalty, 0);
  assert.equal(caseA.refund, 50000);

  // 케이스 B: 40% 출석 (부족률 = (80-40)/80 = 50% -> 페널티 25,000, 환급 25,000)
  const caseB = calculateMemberSettlement(50000, 40, 80);
  assert.equal(caseB.penalty, 25000);
  assert.equal(caseB.refund, 25000);

  // 케이스 C: 0% 출석 (부족률 100% -> 페널티 50,000, 환급 0)
  const caseC = calculateMemberSettlement(50000, 0, 80);
  assert.equal(caseC.penalty, 50000);
  assert.equal(caseC.refund, 0);

  // 2. settleStudyGroup & calculateGroupTotalPenalty
  const group: StudyGroup = {
    id: 'sg1',
    groupName: '회계사 기출 뽀개기',
    subject: '재무회계',
    minAttendanceRate: 80,
    status: 'active',
    members: [
      {
        memberId: 'm1',
        memberName: '이수험',
        depositAmount: 50000,
        attendanceRate: 90,
        penaltyDeducted: 0,
        refundAmount: 0,
      },
      {
        memberId: 'm2',
        memberName: '김게으름',
        depositAmount: 50000,
        attendanceRate: 40,
        penaltyDeducted: 0,
        refundAmount: 0,
      },
    ],
  };

  const settled = settleStudyGroup(group);
  assert.equal(settled.status, 'settled');
  assert.equal(settled.members[0].penaltyDeducted, 0);
  assert.equal(settled.members[0].refundAmount, 50000);
  assert.equal(settled.members[1].penaltyDeducted, 25000);
  assert.equal(settled.members[1].refundAmount, 25000);

  assert.equal(calculateGroupTotalPenalty(settled), 25000);

  console.log('studyGroupEngine tests passed!');
}

run();
