/**
 * 순수 도메인 비즈니스 술어 & 계산 로직 초고속 단위 테스트
 * (Pure Domain Predicates & Edge-Case Unit Tests)
 *
 * 실행: npx tsx src/core/domain/predicates/businessPredicates.test.ts
 */

import assert from 'node:assert/strict';
import {
  calculateDiscountAndTax,
  calculateBillingSplit,
  calculateMidtermRefund,
  isInvoiceOverdue,
  determinePaymentStatus,
  calculateOverdueDays,
  isCapacityExceeded,
  canBookReservationSlot,
  isPassValidAt,
  canDeductSessionPass,
  validateStockMovement,
  validateWalletDeduction,
} from './businessPredicates';

console.log('🧪 [Unit / Predicate Testing] 순수 도메인 로직 및 엣지 케이스 단위 테스트 시작...\n');

// ============================================================================
// Suite 1: 금액 계산 및 분할 납부 1원 단수 불변성 검증
// ============================================================================
console.log('▶ Suite 1: 금액 계산, 부가세, 분할 납부 1원 단수 불변성');

// 1.1 기본 금액 및 할인/부가세 계산
const calc1 = calculateDiscountAndTax(100_000, 10); // 10% 할인
assert.equal(calc1.baseAmount, 100_000);
assert.equal(calc1.discountAmount, 10_000);
assert.equal(calc1.netAmount, 90_000);
assert.equal(calc1.vatAmount, 9_000); // 10% VAT 별도
assert.equal(calc1.totalAmount, 99_000);

// 1.2 엣지 케이스: 100% 전액 할인
const calc100 = calculateDiscountAndTax(150_000, 100);
assert.equal(calc100.discountAmount, 150_000);
assert.equal(calc100.netAmount, 0);
assert.equal(calc100.totalAmount, 0);

// 1.3 엣지 케이스: 부가세 포함(공급대가) 역산
const calcVatInc = calculateDiscountAndTax(110_000, 0, { vatIncluded: true });
assert.equal(calcVatInc.totalAmount, 110_000);
assert.equal(calcVatInc.vatAmount, 10_000); // 100,000원 공급가 + 10,000원 VAT

// 1.4 엣지 케이스: 음수 금액 및 비정상 할인율 방어
const calcNegative = calculateDiscountAndTax(-50_000, -20);
assert.equal(calcNegative.baseAmount, 0);
assert.equal(calcNegative.totalAmount, 0);

const calcOverDiscount = calculateDiscountAndTax(100_000, 150); // 150% 할인 시도 -> 100% 클램핑
assert.equal(calcOverDiscount.totalAmount, 0);

// 1.5 분할 납부 1원 단수 보존 불변식 (sum(splits) === totalAmount)
const splitCases = [
  { total: 100_000, count: 3, expectedSum: 100_000 },
  { total: 1_000, count: 7, expectedSum: 1_000 },
  { total: 10, count: 3, expectedSum: 10 },
  { total: 1, count: 3, expectedSum: 1 },
  { total: 0, count: 5, expectedSum: 0 },
  { total: 250_000, count: 12, expectedSum: 250_000 },
];

for (const sc of splitCases) {
  const splits = calculateBillingSplit(sc.total, sc.count);
  assert.equal(splits.length, sc.count, `회차 수가 일치해야 함 (${sc.count}회)`);
  const sum = splits.reduce((acc, cur) => acc + cur, 0);
  assert.equal(sum, sc.expectedSum, `분할 납부 합계 불변식 검증 실패: ${sum} !== ${sc.expectedSum}`);
}
console.log('  ✔ 통과: 금액 계산, 할인, 부가세 역산 및 분할 납부 1원 단수 보존 불변식 검증 완료');

// ============================================================================
// Suite 2: 중도 해지 환불금 및 10% 위약금 공제
// ============================================================================
console.log('\n▶ Suite 2: 중도 해지 환불 및 위약금 10% 공제 계산');

// 2.1 10회 300,000원 패스 중 3회 사용 후 환불 (정상 환불)
// 회당 30,000원 * 3회 = 90,000원 사용. 잔액 210,000원 - 위약금 30,000원 = 180,000원 환불
const refund1 = calculateMidtermRefund(300_000, 10, 3, 0.1);
assert.equal(refund1.usedAmount, 90_000);
assert.equal(refund1.penaltyAmount, 30_000);
assert.equal(refund1.refundAmount, 180_000);
assert.equal(refund1.isRefundable, true);

// 2.2 엣지 케이스: 잔여액이 위약금보다 적어 환불액이 0원 이하가 되는 경우 (음수 환불 방어)
// 10회 300,000원 중 9회 사용 (사용 270,000원, 잔여 30,000원, 위약금 30,000원 -> 환불 0원)
const refundZero = calculateMidtermRefund(300_000, 10, 9, 0.1);
assert.equal(refundZero.refundAmount, 0);
assert.equal(refundZero.isRefundable, false);

// 2.3 엣지 케이스: 10회 전액 사용 후 환불 요청
const refundAllUsed = calculateMidtermRefund(300_000, 10, 10, 0.1);
assert.equal(refundAllUsed.refundAmount, 0);
assert.equal(refundAllUsed.isRefundable, false);

console.log('  ✔ 통과: 중도 해지 환불 계산 및 음수 환불 방어 검증 완료');

// ============================================================================
// Suite 3: 미납 및 납부 기한 연체 판정 (Overdue Predicates)
// ============================================================================
console.log('\n▶ Suite 3: 납부 기한 및 미납·연체 상태 판정 술어');

const dueBase = '2026-10-31';

// 3.1 기한 당일 23:59:59 (마감 1초 전): 미연체
const refBeforeDeadline = '2026-10-31T23:59:59.000Z';
assert.equal(isInvoiceOverdue(dueBase, refBeforeDeadline), false);

// 3.2 기한 익일 00:00:01 (마감 1초 후): 연체 확정
const refAfterDeadline = '2026-11-01T00:00:01.000Z';
assert.equal(isInvoiceOverdue(dueBase, refAfterDeadline), true);

// 3.3 유예 일수(Grace Days 3일) 적용 시
assert.equal(isInvoiceOverdue(dueBase, '2026-11-02T12:00:00.000Z', 3), false); // 유예 기간 내 -> 미연체
assert.equal(isInvoiceOverdue(dueBase, '2026-11-04T00:00:01.000Z', 3), true);  // 유예 기간 초과 -> 연체

// 3.4 수납 상태 머신 판정 (determinePaymentStatus)
assert.equal(determinePaymentStatus(100_000, 100_000, dueBase, refBeforeDeadline), 'paid');
assert.equal(determinePaymentStatus(100_000, 120_000, dueBase, refBeforeDeadline), 'paid'); // 초과 납부
assert.equal(determinePaymentStatus(100_000, 50_000, dueBase, refBeforeDeadline), 'partial'); // 기한 내 분납
assert.equal(determinePaymentStatus(100_000, 50_000, dueBase, refAfterDeadline), 'overdue');  // 기한 후 미납 잔액 존재 시 연체
assert.equal(determinePaymentStatus(100_000, 0, dueBase, refBeforeDeadline), 'unpaid');
assert.equal(determinePaymentStatus(100_000, 0, dueBase, refAfterDeadline), 'overdue');

// 3.5 연체 일수 계산
assert.equal(calculateOverdueDays(dueBase, '2026-10-31T12:00:00.000Z'), 0);
assert.equal(calculateOverdueDays(dueBase, '2026-11-02T12:00:00.000Z'), 2);

console.log('  ✔ 통과: 1초 전/후 경계값 연체 판정 및 결제 상태 머신 검증 완료');

// ============================================================================
// Suite 4: 예약 정원 및 예약 가능 여부 판정 (Capacity Predicates)
// ============================================================================
console.log('\n▶ Suite 4: 예약 정원 초과 및 예약 적격성 판정 술어');

// 4.1 정원 10명 기준 판정
assert.equal(isCapacityExceeded(10, 8, 1), false); // 8확정 + 1락 = 9명 -> 여유 1석
assert.equal(isCapacityExceeded(10, 9, 1), true);  // 9확정 + 1락 = 10명 -> 만석
assert.equal(isCapacityExceeded(10, 10, 0), true); // 10확정 -> 만석

// 4.2 예약 신청 가능 종합 판정 (canBookReservationSlot)
const bookable = canBookReservationSlot({ capacity: 10, confirmedCount: 8, lockedCount: 1 });
assert.equal(bookable.canBook, true);
assert.equal(bookable.isFull, false);
assert.equal(bookable.remainingSeats, 1);

const fullBook = canBookReservationSlot({ capacity: 10, confirmedCount: 10, lockedCount: 0 });
assert.equal(fullBook.canBook, false);
assert.equal(fullBook.isFull, true);
assert.equal(fullBook.reason, 'capacity_exceeded');

// 4.3 엣지 케이스: 중복 예약 방어
const duplicateBook = canBookReservationSlot({
  capacity: 10,
  confirmedCount: 5,
  userAlreadyBooked: true,
});
assert.equal(duplicateBook.canBook, false);
assert.equal(duplicateBook.reason, 'already_booked');

// 4.4 엣지 케이스: 정원 0명 또는 음수 정원 방어
const zeroCap = canBookReservationSlot({ capacity: 0, confirmedCount: 0 });
assert.equal(zeroCap.canBook, false);
assert.equal(zeroCap.reason, 'invalid_capacity');

console.log('  ✔ 통과: 예약 정원 만석 감지 및 중복 예약 원천 차단 검증 완료');

// ============================================================================
// Suite 5: 이용권 유효기간 및 세션 차감 판정 (Pass Validity & Deduction)
// ============================================================================
console.log('\n▶ Suite 5: 이용권 유효기간 경계값 및 1회 차감 판정 술어');

const passExpiry = '2026-10-31';

// 5.1 유효기간 경계값 검증: 만료일 23:59:59.000 vs 익일 00:00:01
assert.equal(isPassValidAt(passExpiry, '2026-10-31T23:59:59.000Z'), true);
assert.equal(isPassValidAt(passExpiry, '2026-11-01T00:00:01.000Z'), false);

// 5.2 무제한 이용권 (validUntil undefined)
assert.equal(isPassValidAt(undefined, '2099-12-31T00:00:00.000Z'), true);

// 5.3 세션 차감 적격성 판정 (canDeductSessionPass)
// 정상 차감
const deductOk = canDeductSessionPass(
  { status: 'active', remainingSessions: 5, validUntil: passExpiry },
  '2026-10-25T10:00:00.000Z'
);
assert.equal(deductOk.canDeduct, true);
assert.equal(deductOk.remainingAfter, 4);

// 엣지 케이스: 잔여 0회 이용권 차감 시도
const deductExhausted = canDeductSessionPass(
  { status: 'active', remainingSessions: 0, validUntil: passExpiry },
  '2026-10-25T10:00:00.000Z'
);
assert.equal(deductExhausted.canDeduct, false);
assert.equal(deductExhausted.reason, 'exhausted');

// 엣지 케이스: 일시정지(holding/suspended) 이용권 차감 시도
const deductInactive = canDeductSessionPass(
  { status: 'suspended', remainingSessions: 5, validUntil: passExpiry },
  '2026-10-25T10:00:00.000Z'
);
assert.equal(deductInactive.canDeduct, false);
assert.equal(deductInactive.reason, 'inactive_status');

// 엣지 케이스: 만료일 경과 이용권 차감 시도
const deductExpired = canDeductSessionPass(
  { status: 'active', remainingSessions: 5, validUntil: passExpiry },
  '2026-11-01T10:00:00.000Z'
);
assert.equal(deductExpired.canDeduct, false);
assert.equal(deductExpired.reason, 'expired');

console.log('  ✔ 통과: 만료일 1초 전/후 경계값 판정 및 잔여 0회/정지 상태 차단 검증 완료');

// ============================================================================
// Suite 6: 재고 및 잔액 안전성 검증 (Negative Stock & Zero Balance Guards)
// ============================================================================
console.log('\n▶ Suite 6: 음수 재고 및 잔액 0원 방어 가드 술어');

// 6.1 정상 출고
const stockOutOk = validateStockMovement(10, 4, 'OUT');
assert.equal(stockOutOk.isValid, true);
assert.equal(stockOutOk.resultingStock, 6);

// 6.2 엣지 케이스: 현재 재고를 초과하는 출고 요청 -> 음수 재고 원천 차단
const stockOutNegative = validateStockMovement(5, 6, 'OUT');
assert.equal(stockOutNegative.isValid, false);
assert.equal(stockOutNegative.resultingStock, 5);
assert.equal(stockOutNegative.error, 'negative_stock_prevented');

// 6.3 엣지 케이스: 0개 이하 비정상 출고 요청 방어
const stockOutZero = validateStockMovement(5, 0, 'OUT');
assert.equal(stockOutZero.isValid, false);
assert.equal(stockOutZero.error, 'invalid_quantity');

// 6.4 지갑 잔액 출금 검증
const walletOk = validateWalletDeduction(50_000, 30_000);
assert.equal(walletOk.canDeduct, true);
assert.equal(walletOk.resultingBalance, 20_000);

// 6.5 엣지 케이스: 잔액 0원 지갑에서 출금 시도 방어
const walletZero = validateWalletDeduction(0, 1_000);
assert.equal(walletZero.canDeduct, false);
assert.equal(walletZero.error, 'insufficient_funds');

// 6.6 엣지 케이스: 잔액보다 큰 금액 출금 시도 방어
const walletOver = validateWalletDeduction(10_000, 15_000);
assert.equal(walletOver.canDeduct, false);
assert.equal(walletOver.error, 'insufficient_funds');

console.log('  ✔ 통과: 음수 재고 차단 및 잔액 0원 지갑 출금 방어 검증 완료');

console.log('\n✨ [Unit / Predicate Testing] 6대 영역 전수 엣지 케이스 단위 테스트 100% 통과!\n');
