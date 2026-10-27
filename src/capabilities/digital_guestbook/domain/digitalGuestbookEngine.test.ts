import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateGuestbookConsent,
  formatPhoneNumber,
  renderGuestbookCardSvg,
  formatGuestbookWelcomeText,
  type DigitalGuestbookEntryItem,
} from './digitalGuestbookEngine';

describe('digital_guestbook - domain engine', () => {
  it('개인정보 동의 여부를 정확히 검증한다', () => {
    const valid = validateGuestbookConsent(true);
    assert.equal(valid.valid, true);

    const invalid = validateGuestbookConsent(false);
    assert.equal(invalid.valid, false);
    assert.ok(invalid.message?.includes('동의해야'));
  });

  it('전화번호 서식을 표준 형태로 정리한다', () => {
    assert.equal(formatPhoneNumber('01012345678'), '010-1234-5678');
    assert.equal(formatPhoneNumber('021234567'), '02-123-4567');
    assert.equal(formatPhoneNumber(''), '');
  });

  it('W3C SVG 접수증 및 웰컴 안내 텍스트가 정상 생성된다', () => {
    const entry: DigitalGuestbookEntryItem = {
      id: 'gb-1',
      organizationId: 'org-1',
      visitorName: '강태양',
      phone: '010-9988-7766',
      visitPurpose: 'consultation',
      interestedProgram: '주말 1:1 보컬 마스터 클래스',
      referralSource: '인스타그램',
      privacyAgreed: true,
      marketingAgreed: true,
      status: 'checked_in',
      assignedStaffName: '이지은 실장',
      createdAt: '2026-10-17T14:20:00Z',
      updatedAt: '2026-10-17T14:20:00Z',
    };

    const svg = renderGuestbookCardSvg(entry);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('강태양'));
    assert.ok(svg.includes('주말 1:1 보컬 마스터 클래스'));
    assert.ok(svg.includes('접수완료'));

    const text = formatGuestbookWelcomeText(entry, '모아 실용음악아카데미');
    assert.ok(text.includes('모아 실용음악아카데미'));
    assert.ok(text.includes('강태양'));
    assert.ok(text.includes('주말 1:1 보컬 마스터 클래스'));
  });
});
