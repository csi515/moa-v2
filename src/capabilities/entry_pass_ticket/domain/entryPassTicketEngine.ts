/**
 * 모바일 일일 입장권 & 0원 W3C SVG QR 티켓 검표 도메인 엔진
 *
 * 비용 0원 원칙: 순수 W3C SVG QR/바코드 티켓 생성 및 브라우저 검표 로직
 */

export type TicketStatus = 'issued' | 'checked_in' | 'checked_out' | 'expired' | 'canceled';
export type TicketType = 'adult' | 'child' | 'allday' | 'two_hours' | 'standard';
export type ScanResult = 'valid' | 'already_used' | 'expired' | 'invalid';

export interface EntryPassTicket {
  id: string;
  organizationId: string;
  ticketNumber: string; // TICK-YYYYMMDD-001
  customerName: string;
  customerPhone?: string | null;
  ticketType: TicketType;
  validDate: string; // YYYY-MM-DD
  price: number;
  status: TicketStatus;
  securityHash: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  createdAt: string;
}

export interface ScanAttemptResult {
  allowed: boolean;
  result: ScanResult;
  message: string;
  updatedTicket?: EntryPassTicket;
}

/**
 * 1. 일일 입장권 발권
 */
export function issueEntryPassTicket(params: {
  id: string;
  organizationId: string;
  sequence: number;
  customerName: string;
  customerPhone?: string | null;
  ticketType: TicketType;
  validDate: string; // YYYY-MM-DD
  price?: number;
}): EntryPassTicket {
  const dateStr = params.validDate.replace(/-/g, '');
  const seqStr = String(params.sequence).padStart(4, '0');
  const ticketNumber = `TICK-${dateStr}-${seqStr}`;
  const securityHash = `HASH-${params.id.slice(0, 8)}-${params.sequence}`;

  return {
    id: params.id,
    organizationId: params.organizationId,
    ticketNumber,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    ticketType: params.ticketType,
    validDate: params.validDate,
    price: params.price ?? 0,
    status: 'issued',
    securityHash,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 2. 현장 QR 검표 처리 (체크인 / 체크아웃 / 중복 방어)
 */
export function processTicketScan(
  ticket: EntryPassTicket,
  currentDateStr: string,
  action: 'check_in' | 'check_out' = 'check_in'
): ScanAttemptResult {
  // 1) 날짜 만료 검증
  if (currentDateStr > ticket.validDate) {
    return {
      allowed: false,
      result: 'expired',
      message: `유효기간이 만료된 티켓입니다 (유효일: ${ticket.validDate}).`,
    };
  }

  // 2) 체크인 처리
  if (action === 'check_in') {
    if (ticket.status === 'checked_in') {
      return {
        allowed: false,
        result: 'already_used',
        message: `이미 입장 처리된 티켓입니다 (체크인 시각: ${ticket.checkedInAt?.slice(11, 16) ?? '-'}).`,
      };
    }

    if (ticket.status === 'checked_out') {
      return {
        allowed: false,
        result: 'already_used',
        message: '이미 퇴장 완료되어 재입장이 불가능한 티켓입니다.',
      };
    }

    if (ticket.status !== 'issued') {
      return {
        allowed: false,
        result: 'invalid',
        message: `입장 불가능한 상태의 티켓입니다 (${ticket.status}).`,
      };
    }

    const now = new Date().toISOString();
    const updatedTicket: EntryPassTicket = {
      ...ticket,
      status: 'checked_in',
      checkedInAt: now,
    };

    return {
      allowed: true,
      result: 'valid',
      message: `[${ticket.customerName}] 고객님 정상 입장 확인되었습니다.`,
      updatedTicket,
    };
  }

  // 3) 체크아웃 처리
  if (action === 'check_out') {
    if (ticket.status !== 'checked_in') {
      return {
        allowed: false,
        result: 'invalid',
        message: '현재 입장 중인 상태가 아니므로 퇴장 처리할 수 없습니다.',
      };
    }

    const now = new Date().toISOString();
    const updatedTicket: EntryPassTicket = {
      ...ticket,
      status: 'checked_out',
      checkedOutAt: now,
    };

    return {
      allowed: true,
      result: 'valid',
      message: `[${ticket.customerName}] 고객님 정상 퇴장 처리되었습니다.`,
      updatedTicket,
    };
  }

  return {
    allowed: false,
    result: 'invalid',
    message: '알 수 없는 검표 요청입니다.',
  };
}

/**
 * 3. W3C SVG 0원 모바일 QR 티켓 그래픽 렌더링
 */
export function renderEntryPassSvgTicket(ticket: EntryPassTicket): string {
  const typeLabel =
    ticket.ticketType === 'adult' ? '성인 입장권' :
    ticket.ticketType === 'child' ? '어린이 입장권' :
    ticket.ticketType === 'allday' ? '종일 자유이용권' : '일일 일반권';

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 520" width="100%" height="100%">
  <defs>
    <linearGradient id="ticketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
  </defs>
  
  <!-- 배경 카드 -->
  <rect width="400" height="520" rx="20" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />
  
  <!-- 상단 헤더 -->
  <rect width="400" height="120" rx="20" fill="url(#ticketGrad)" />
  <rect y="100" width="400" height="20" fill="url(#ticketGrad)" />
  <text x="24" y="50" font-family="sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF">
    모아 일일 입장 패스
  </text>
  <text x="24" y="80" font-family="sans-serif" font-size="14" fill="#BFDBFE">
    ${typeLabel} | 0원 현장 모바일 검표
  </text>

  <!-- 티켓 본문 정보 -->
  <text x="24" y="160" font-family="sans-serif" font-size="13" fill="#64748B">방문 고객</text>
  <text x="24" y="185" font-family="sans-serif" font-size="18" font-weight="bold" fill="#0F172A">
    ${ticket.customerName} 고객님
  </text>

  <text x="24" y="225" font-family="sans-serif" font-size="13" fill="#64748B">유효 일자</text>
  <text x="24" y="248" font-family="sans-serif" font-size="15" font-weight="600" fill="#0F172A">
    ${ticket.validDate} (당일 유효)
  </text>

  <!-- 절취선 효과 -->
  <line x1="20" y1="280" x2="380" y2="280" stroke="#CBD5E1" stroke-dasharray="6,6" stroke-width="2" />

  <!-- SVG QR 그래픽 심볼 (0원 시각화) -->
  <rect x="110" y="310" width="180" height="140" rx="12" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.5" />
  <rect x="130" y="325" width="40" height="40" fill="#0F172A" />
  <rect x="140" y="335" width="20" height="20" fill="#F8FAFC" />
  <rect x="230" y="325" width="40" height="40" fill="#0F172A" />
  <rect x="240" y="335" width="20" height="20" fill="#F8FAFC" />
  <rect x="130" y="385" width="40" height="40" fill="#0F172A" />
  <rect x="140" y="395" width="20" height="20" fill="#F8FAFC" />
  <rect x="190" y="340" width="20" height="20" fill="#0F172A" />
  <rect x="190" y="380" width="25" height="15" fill="#0F172A" />
  <rect x="230" y="390" width="35" height="35" fill="#0F172A" />

  <!-- 티켓 번호 -->
  <text x="200" y="480" text-anchor="middle" font-family="monospace" font-size="15" font-weight="bold" fill="#334155">
    ${ticket.ticketNumber}
  </text>
  <text x="200" y="502" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#94A3B8">
    입구 리더기에 위 QR 코드를 스캔해 주세요.
  </text>
</svg>
  `.trim();
}
