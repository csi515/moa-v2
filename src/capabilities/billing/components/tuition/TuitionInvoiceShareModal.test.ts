import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildTuitionNoticeMessage } from './TuitionInvoiceShareModal';

describe('TuitionInvoiceShareModal - 알림톡/문자 템플릿 생성기', () => {
  it('buildTuitionNoticeMessage는 사업장명, 고객명, 청구금액, 납부기한, 입금계좌를 올바르게 조합한다', () => {
    const msg = buildTuitionNoticeMessage({
      academyName: '모아 스튜디오',
      studentName: '김선율',
      guardianName: '김부모',
      yearMonth: '2026-11',
      totalAmount: 200000,
      unpaidAmount: 200000,
      dueDate: '2026-11-25',
      bankAccountText: '국민은행 123-456-7890 (예금주: 모아)',
    });

    assert.ok(msg.includes('[모아 스튜디오]'));
    assert.ok(msg.includes('김선율'));
    assert.ok(msg.includes('김부모'));
    assert.ok(msg.includes('2026년 11월'));
    assert.ok(msg.includes('200,000원'));
    assert.ok(msg.includes('2026-11-25'));
    assert.ok(msg.includes('국민은행 123-456-7890'));
  });

  it('계좌가 비어있을 경우 문의 문구로 자동 보정된다', () => {
    const msg = buildTuitionNoticeMessage({
      academyName: '모아 스튜디오',
      studentName: '김선율',
      yearMonth: '2026-11',
      totalAmount: 150000,
      unpaidAmount: 0,
      dueDate: '말일까지',
      bankAccountText: '',
    });

    assert.ok(msg.includes('사업장으로 문의'));
    assert.ok(msg.includes('150,000원'));
  });
});
