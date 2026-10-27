import assert from 'node:assert/strict';
import {
  createSubstituteRequest,
  applySubstituteBid,
  approveSubstituteBid,
  assembleSubstituteBroadcastMessage,
} from './substituteDispatchEngine.js';

console.log('[test:substitute-dispatch] starting test suite...');

// 1. 대강 요청 생성
const req = createSubstituteRequest({
  id: 'req-1',
  organizationId: 'org-test',
  requesterStaffId: 'staff-1',
  requesterName: '이지은',
  className: '초등 바이엘 3반',
  targetDate: '2026-10-20',
  startTime: '15:00',
  endTime: '15:50',
  reason: 'illness',
  reasonDetail: '감기몸살',
  offeredFee: 35000,
});

assert.equal(req.status, 'open');
assert.equal(req.className, '초등 바이엘 3반');
console.log('✓ 1. 대강 요청 생성 통과');

// 2. 대체 강사 지원 등록
const { bid: bid1, updatedRequest: reqAfterBid1 } = applySubstituteBid(req, {
  id: 'bid-1',
  staffId: 'staff-2',
  name: '박서준',
  message: '해당 시간대 가능합니다.',
});
assert.equal(bid1.candidateName, '박서준');
assert.equal(reqAfterBid1.status, 'applied');

const { bid: bid2 } = applySubstituteBid(reqAfterBid1, {
  id: 'bid-2',
  staffId: 'staff-3',
  name: '최민수',
  message: '저도 가능합니다.',
});
assert.equal(bid2.candidateName, '최민수');
console.log('✓ 2. 복수 강사 지원(Bid) 등록 통과');

// 3. 관리자 원클릭 승인 및 다른 지원자 반려 처리
const allBids = [bid1, bid2];
const { approvedRequest, updatedBids } = approveSubstituteBid(reqAfterBid1, bid1, allBids);

assert.equal(approvedRequest.status, 'approved');
assert.equal(approvedRequest.assignedName, '박서준');
assert.equal(updatedBids.find((b) => b.id === 'bid-1')?.status, 'selected');
assert.equal(updatedBids.find((b) => b.id === 'bid-2')?.status, 'rejected');
console.log('✓ 3. 관리자 원클릭 승인 및 타 지원자 자동 반려 통과');

// 4. 단톡방 공지 텍스트 조립
const message = assembleSubstituteBroadcastMessage(req);
assert.match(message, /\[🚨 긴급 대강\/대진 강사 모집 공고\]/);
assert.match(message, /초등 바이엘 3반/);
assert.match(message, /병가\/건강상 이유/);
assert.match(message, /35,000원/);
console.log('✓ 4. 긴급 공고 텍스트 조립 통과');

console.log('[test:substitute-dispatch] ALL TESTS PASSED! (100%)');
