import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  toAcademyFriendlyTerm,
  getAcademyStatusLabel,
  getAcademyInvoiceStatusLabel,
  getAcademyPaymentMethodLabel,
  ACADEMY_FRIENDLY_TERMS,
} from './academyFriendlyTerms';

describe('academyFriendlyTerms', () => {
  it('시스템 기술 용어를 친숙한 현장 학원 용어로 100% 매핑해야 한다', () => {
    assert.equal(toAcademyFriendlyTerm('billing'), '수강료 수납 및 청구');
    assert.equal(toAcademyFriendlyTerm('invoicing'), '수강료 청구 고지');
    assert.equal(toAcademyFriendlyTerm('invoice'), '수강료 고지서');
    assert.equal(toAcademyFriendlyTerm('customer'), '원생');
    assert.equal(toAcademyFriendlyTerm('member'), '원생');
    assert.equal(toAcademyFriendlyTerm('placement'), '수업 시간표 배정');
    assert.equal(toAcademyFriendlyTerm('credit'), '원비 지갑');
    assert.equal(toAcademyFriendlyTerm('deposit'), '선불 충전금');
    assert.equal(toAcademyFriendlyTerm('ledger'), '학원 장부');
    assert.equal(toAcademyFriendlyTerm('roster'), '원생 명부');
    assert.equal(toAcademyFriendlyTerm('attendance'), '출결 관리');
    assert.equal(toAcademyFriendlyTerm('checkin'), '등원 (출석)');
  });

  it('대소문자 및 공백을 정규화하여 매핑해야 한다', () => {
    assert.equal(toAcademyFriendlyTerm('  BILLING  '), '수강료 수납 및 청구');
    assert.equal(toAcademyFriendlyTerm('Placement'), '수업 시간표 배정');
    assert.equal(toAcademyFriendlyTerm('CUSTOMER'), '원생');
  });

  it('원생 재원 상태를 정확한 우리말로 반환해야 한다', () => {
    assert.equal(getAcademyStatusLabel('active'), '재원 중');
    assert.equal(getAcademyStatusLabel('paused'), '휴원');
    assert.equal(getAcademyStatusLabel('withdrawn'), '퇴원');
    assert.equal(getAcademyStatusLabel('pending'), '등록 대기');
    assert.equal(getAcademyStatusLabel('unknown_custom'), 'unknown_custom');
    assert.equal(getAcademyStatusLabel(null), '미지정');
  });

  it('수강료 청구 상태를 현장 용어로 변환해야 한다', () => {
    assert.equal(getAcademyInvoiceStatusLabel('paid'), '당월 완납');
    assert.equal(getAcademyInvoiceStatusLabel('unpaid'), '미납');
    assert.equal(getAcademyInvoiceStatusLabel('partial'), '일부 납부');
    assert.equal(getAcademyInvoiceStatusLabel('overdue'), '연체');
  });

  it('결제 수단을 직관적인 한글로 변환해야 한다', () => {
    assert.equal(getAcademyPaymentMethodLabel('onsite_card'), '학원 현장 카드 결제');
    assert.equal(getAcademyPaymentMethodLabel('bank_transfer'), '계좌 이체');
    assert.equal(getAcademyPaymentMethodLabel('cash'), '현금 수납');
    assert.equal(getAcademyPaymentMethodLabel('credit_wallet'), '선불 원비 지갑 차감');
  });
});
