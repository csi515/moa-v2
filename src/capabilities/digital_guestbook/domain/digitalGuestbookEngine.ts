/**
 * digital_guestbook 도메인 비즈니스 엔진
 * 오프라인 내방객 전자 방명록 & 마케팅 동의기
 */

export type VisitPurpose = 'consultation' | 'open_house' | 'trial_inquiry' | 'event_guest' | 'walk_in';
export type GuestbookStatus = 'checked_in' | 'consulting' | 'converted' | 'closed';

export interface DigitalGuestbookEntryItem {
  id: string;
  organizationId: string;
  visitorName: string;
  phone: string;
  visitPurpose: VisitPurpose;
  interestedProgram?: string | null;
  referralSource?: string | null;
  privacyAgreed: boolean;
  marketingAgreed: boolean;
  signatureSvg?: string | null;
  assignedStaffName?: string | null;
  notes?: string | null;
  status: GuestbookStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * 개인정보 수집 필수 동의 검증
 */
export function validateGuestbookConsent(privacyAgreed: boolean): { valid: boolean; message?: string } {
  if (!privacyAgreed) {
    return {
      valid: false,
      message: '개인정보 수집 및 이용에 동의해야 방명록 작성이 가능합니다.',
    };
  }
  return { valid: true };
}

/**
 * 전화번호 서식 정리
 */
export function formatPhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    if (digits.startsWith('02')) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith('02')) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return raw;
}

/**
 * 0원 W3C SVG 내방객 환영 및 상담 접수증 카드 생성
 */
export function renderGuestbookCardSvg(entry: DigitalGuestbookEntryItem): string {
  const safeName = (entry.visitorName || '방문객')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeProgram = (entry.interestedProgram || '정규 프로그램')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safePurpose = (entry.visitPurpose || '상담')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeStaff = (entry.assignedStaffName || '배정 대기')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeDate = (entry.createdAt || new Date().toISOString()).slice(0, 16).replace('T', ' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 250" width="100%" height="100%">
  <rect width="420" height="250" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="0" y="0" width="420" height="46" rx="16" fill="#0f172a"/>
  <rect x="0" y="26" width="420" height="20" fill="#0f172a"/>
  <text x="24" y="30" fill="#ffffff" font-size="15" font-weight="bold" font-family="sans-serif">📋 현장 내방객 전자 방명록</text>
  <rect x="320" y="12" width="76" height="24" rx="12" fill="#3b82f6"/>
  <text x="358" y="28" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">접수완료</text>

  <text x="24" y="80" fill="#64748b" font-size="12" font-family="sans-serif">방문객 성함</text>
  <text x="24" y="110" fill="#0f172a" font-size="22" font-weight="bold" font-family="sans-serif">${safeName} 님</text>

  <text x="220" y="80" fill="#64748b" font-size="12" font-family="sans-serif">관심 프로그램</text>
  <text x="220" y="110" fill="#0284c7" font-size="16" font-weight="bold" font-family="sans-serif">${safeProgram}</text>

  <line x1="24" y1="135" x2="396" y2="135" stroke="#f1f5f9" stroke-width="1.5"/>

  <text x="24" y="165" fill="#64748b" font-size="12" font-family="sans-serif">방문 목적: <tspan fill="#334155" font-weight="bold">${safePurpose}</tspan></text>
  <text x="24" y="190" fill="#64748b" font-size="12" font-family="sans-serif">접수 일시: ${safeDate}</text>
  <text x="220" y="165" fill="#64748b" font-size="12" font-family="sans-serif">마케팅 수신동의: ${entry.marketingAgreed ? '✅ 동의함' : '미동의'}</text>
  <text x="220" y="190" fill="#64748b" font-size="12" font-family="sans-serif">담당 상담사: ${safeStaff}</text>

  <text x="210" y="230" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="sans-serif">Moa Digital Guestbook • 개인정보보호법 준수 안전 보관</text>
</svg>`;
}

/**
 * 0원 내방 고객 웰컴 카톡/문자 텍스트 템플릿
 */
export function formatGuestbookWelcomeText(entry: DigitalGuestbookEntryItem, orgName: string): string {
  const programText = entry.interestedProgram ? `\n- 관심 프로그램: ${entry.interestedProgram}` : '';

  return `[${orgName}] 방문해 주셔서 진심으로 감사드립니다!

안녕하세요, ${entry.visitorName}님.
오늘 ${orgName}에 귀한 걸음 해 주셔서 대단히 감사드립니다.${programText}

전문 상담 선생님께서 준비를 마치는 대로 정성을 다해 맞춤 안내를 도와드리겠습니다.
잠시만 대기 공간에서 편안하게 차 한잔하시며 머물러 주시기 바랍니다.`;
}
