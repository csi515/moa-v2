import assert from 'node:assert/strict';
import {
  stampCard,
  redeemRewardCoupon,
  recordAttendanceStamp,
  recordPurchaseStamp,
  convertRewardCouponToPass,
  createCustomerDefaultBoard,
  type StampBoard,
  type StampRewardCoupon,
} from './loyaltyStampEngine';

function run() {
  const initialBoard: StampBoard = {
    id: 'board-1',
    customerId: 'cust-1',
    customerName: '김철수',
    boardTitle: '단골 카페 스탬프',
    targetCount: 10,
    currentCount: 8,
    rewardTitle: '아메리카노 1잔 무료 교환권',
    rewardCouponValidityDays: 30,
    completedCount: 0,
    updatedAt: '2026-10-01T10:00:00Z',
  };

  // 1. 수동 스탬프 1개 적립 (8 -> 9, 미완성)
  const act1 = stampCard({ board: initialBoard, addCount: 1, timestamp: '2026-10-15T12:00:00Z' });
  assert.equal(act1.isCompleted, false);
  assert.equal(act1.updatedBoard.currentCount, 9);
  assert.equal(act1.updatedBoard.completedCount, 0);
  assert.equal(act1.issuedCoupon, undefined);
  assert.equal(act1.eventRecord?.source, 'MANUAL');

  // 2. 출석 이벤트(attendance) 기반 자동 적립 (9 + 1 = 10 -> 목표 달성 및 쿠폰 발급)
  const attRes = recordAttendanceStamp({
    board: act1.updatedBoard,
    attendanceId: 'att-2026-10-16-01',
    processedEventIds: [],
    timestamp: '2026-10-16T15:00:00Z',
  });
  assert.equal(attRes.success, true);
  assert.equal(attRes.result?.isCompleted, true);
  assert.equal(attRes.result?.updatedBoard.completedCount, 1);
  assert.equal(attRes.result?.updatedBoard.currentCount, 0);
  assert.equal(attRes.result?.eventRecord?.source, 'ATTENDANCE');
  assert.equal(attRes.result?.eventRecord?.sourceReferenceId, 'att-2026-10-16-01');

  // 3. 중복 출석 적립 방어 (이미 처리된 attendanceId)
  const dupAttRes = recordAttendanceStamp({
    board: attRes.result!.updatedBoard,
    attendanceId: 'att-2026-10-16-01',
    processedEventIds: ['att-2026-10-16-01'],
  });
  assert.equal(dupAttRes.success, false);
  assert.equal(dupAttRes.error, 'ALREADY_PROCESSED_ATTENDANCE');

  // 4. 결제 이벤트(purchase) 기반 15,000원 구매 (5,000원당 1개 -> 3개 적립)
  const purchaseRes = recordPurchaseStamp({
    board: attRes.result!.updatedBoard,
    saleId: 'sale-999',
    saleAmount: 15000,
    unitAmountPerStamp: 5000,
  });
  assert.equal(purchaseRes.success, true);
  assert.equal(purchaseRes.stampsCalculated, 3);
  assert.equal(purchaseRes.result?.updatedBoard.currentCount, 3);
  assert.equal(purchaseRes.result?.eventRecord?.source, 'PURCHASE');

  // 5. 발급된 리워드 쿠폰을 passes (이용권)으로 변환 등록 연동
  const coupon = attRes.result!.issuedCoupon!;
  assert.ok(coupon);
  const { passRecord, updatedCoupon } = convertRewardCouponToPass({
    coupon,
    organizationId: 'org-test-123',
    validityDays: 30,
  });
  assert.equal(passRecord.organization_id, 'org-test-123');
  assert.equal(passRecord.student_id, 'cust-1');
  assert.equal(passRecord.remaining_count, 1);
  assert.equal(passRecord.pass_type, 'COUNT');
  assert.equal(updatedCoupon.convertedPassId, passRecord.id);

  // 6. 발급된 리워드 쿠폰 사용 처리
  const redeemSuccess = redeemRewardCoupon(updatedCoupon, '2026-10-20');
  assert.equal(redeemSuccess.success, true);
  assert.equal(redeemSuccess.updatedCoupon.isRedeemed, true);

  // 7. 이미 사용한 쿠폰 재사용 시도 방어
  const reRedeem = redeemRewardCoupon(redeemSuccess.updatedCoupon, '2026-10-21');
  assert.equal(reRedeem.success, false);
  assert.equal(reRedeem.error, 'ALREADY_REDEEMED');

  // 8. 신규 기본 보드 템플릿 생성 헬퍼 검증
  const academyBoard = createCustomerDefaultBoard({
    customerId: 'cust-academy-1',
    customerName: '홍길동',
    templateType: 'ACADEMY_PRAISE',
  });
  assert.equal(academyBoard.boardTitle, '성실 출석 & 열정 칭찬 스티커판');
  assert.equal(academyBoard.targetCount, 10);

  console.log('loyaltyStampEngine.test.ts: ok');
}

run();
