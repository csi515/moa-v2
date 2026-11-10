import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTuitionNoticeMessage,
  TuitionInvoiceShareModal,
} from './TuitionInvoiceShareModal';

describe('TuitionInvoiceShareModal (3번: 원비 수납 계좌 및 카톡 청구 안내)', () => {
  it('buildTuitionNoticeMessage는 학원명, 학생명, 청구금액, 납부기한, 입금계좌를 올바르게 조합한다', () => {
    const msg = buildTuitionNoticeMessage({
      academyName: '모아음악학원',
      studentName: '김도윤',
      guardianName: '김철수',
      yearMonth: '2026-11',
      totalAmount: 160000,
      unpaidAmount: 160000,
      dueDate: '2026-11-10',
      bankAccountText: '국민은행 123-456-7890 (예금주: 모아학원)',
    });

    assert.ok(msg.includes('[모아음악학원]'));
    assert.ok(msg.includes('김철수 학부모님'));
    assert.ok(msg.includes('2026년 11월 수강료'));
    assert.ok(msg.includes('김도윤'));
    assert.ok(msg.includes('160,000'));
    assert.ok(msg.includes('2026-11-10'));
    assert.ok(msg.includes('국민은행 123-456-7890'));
  });

  it('계좌가 비어있을 경우 학원 문의 문구로 자동 보정된다', () => {
    const msg = buildTuitionNoticeMessage({
      academyName: '음악스튜디오',
      studentName: '박서아',
      yearMonth: '2026-12',
      totalAmount: 200000,
      unpaidAmount: 200000,
      dueDate: '2026-12-10',
      bankAccountText: '',
    });

    assert.ok(msg.includes('학원으로 문의'));
    assert.ok(msg.includes('박서아 학생 학부모님'));
  });

  it('TuitionInvoiceShareModal 컴포넌트가 함수 컴포넌트로 정상 export 된다', () => {
    assert.equal(typeof TuitionInvoiceShareModal, 'function');
  });
});
