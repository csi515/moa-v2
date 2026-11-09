import assert from 'node:assert/strict';
import test from 'node:test';
import { generateTuitionReceiptText } from './receiptShareHelpers';

test('generateTuitionReceiptText: 기본 영수증 서식 생성', () => {
  const result = generateTuitionReceiptText({
    academyName: '라온 피아노 스튜디오',
    studentName: '이서윤',
    yearMonth: '2026-11',
    payAmount: 180000,
    payMethodLabel: '신용카드',
    payDate: '2026-11-09',
  });

  assert.ok(result.includes('[라온 피아노 스튜디오] 수납 확인 영수증'));
  assert.ok(result.includes('• 원생명: 이서윤'));
  assert.ok(result.includes('• 수강월: 2026년 11월'));
  assert.ok(result.includes('• 결제수단: 신용카드'));
  assert.ok(result.includes('• 수납금액: 180,000원'));
  assert.ok(!result.includes('• 수납내역/메모:'));
});

test('generateTuitionReceiptText: 원페이퍼 부대비용 및 메모 포함 서식 생성', () => {
  const result = generateTuitionReceiptText({
    studentName: '박서준',
    yearMonth: '2026-12',
    payAmount: 245000,
    payMethodLabel: '계좌이체',
    payDate: '2026-12-01',
    memo: '정기 수강료 (180,000원) + 바이엘/체르니 (15,000원) + 콩쿠르 참가비 (50,000원)',
  });

  assert.ok(result.includes('[음악학원] 수납 확인 영수증'));
  assert.ok(result.includes('• 원생명: 박서준'));
  assert.ok(result.includes('• 수강월: 2026년 12월'));
  assert.ok(result.includes('• 수납금액: 245,000원'));
  assert.ok(result.includes('• 수납내역/메모: 정기 수강료 (180,000원) + 바이엘/체르니 (15,000원) + 콩쿠르 참가비 (50,000원)'));
  assert.ok(result.includes('소중한 자녀를 믿고 맡겨주셔서 감사합니다. 🎵'));
});
