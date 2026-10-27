/**
 * emergency_alert_broadcast 도메인 비즈니스 엔진
 * 긴급 휴원·재난 공지 & 모바일 수신확인 대장
 */

export type EmergencyType = 'weather' | 'facility_failure' | 'epidemic' | 'safety_alert' | 'other';
export type EmergencySeverity = 'advisory' | 'warning' | 'critical';

export interface EmergencyBroadcastItem {
  id: string;
  organizationId: string;
  title: string;
  emergencyType: EmergencyType;
  severity: EmergencySeverity;
  effectiveStart: string;
  effectiveEnd?: string | null;
  closureReason: string;
  makeupPolicyNotice?: string | null;
  targetAudience: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyBroadcastReceiptItem {
  id: string;
  organizationId: string;
  broadcastId: string;
  recipientName: string;
  recipientPhone?: string | null;
  recipientRole: string;
  isAcknowledged: boolean;
  acknowledgedAt?: string | null;
  createdAt: string;
}

export interface AcknowledgmentStatsResult {
  total: number;
  acknowledgedCount: number;
  pendingCount: number;
  ackRatePct: number;
}

/**
 * 수신 확인율 통계 계산
 */
export function calculateAcknowledgmentStats(receipts: EmergencyBroadcastReceiptItem[]): AcknowledgmentStatsResult {
  const total = receipts.length;
  if (total === 0) {
    return { total: 0, acknowledgedCount: 0, pendingCount: 0, ackRatePct: 0 };
  }
  const acknowledgedCount = receipts.filter((r) => r.isAcknowledged).length;
  const pendingCount = total - acknowledgedCount;
  const ackRatePct = Math.round((acknowledgedCount / total) * 100);

  return { total, acknowledgedCount, pendingCount, ackRatePct };
}

/**
 * 아직 공지를 확인하지 않은 미확인자 추출
 */
export function filterPendingRecipients(receipts: EmergencyBroadcastReceiptItem[]): EmergencyBroadcastReceiptItem[] {
  return receipts.filter((r) => !r.isAcknowledged);
}

/**
 * 긴급도에 따른 헤더 테마 색상 반환
 */
export function getSeverityStyle(severity: EmergencySeverity): { headerBg: string; label: string } {
  switch (severity) {
    case 'critical':
      return { headerBg: '#dc2626', label: '🚨 긴급 비상 휴원' };
    case 'warning':
      return { headerBg: '#ea580c', label: '⚠️ 임시 단축/휴강' };
    case 'advisory':
    default:
      return { headerBg: '#0284c7', label: '📢 긴급 운영 안내' };
  }
}

/**
 * 0원 W3C SVG 긴급 휴원/휴관 공식 공고문 카드 생성
 */
export function renderEmergencyAlertSvg(broadcast: EmergencyBroadcastItem): string {
  const style = getSeverityStyle(broadcast.severity);
  const safeTitle = (broadcast.title || '긴급 휴원 공고')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeReason = (broadcast.closureReason || '안전을 위한 긴급 휴원')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeStartDate = (broadcast.effectiveStart || new Date().toISOString()).slice(0, 16).replace('T', ' ');
  const safeEndDate = broadcast.effectiveEnd ? broadcast.effectiveEnd.slice(0, 16).replace('T', ' ') : '상황 종료 시까지';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 280" width="100%" height="100%">
  <rect width="460" height="280" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  
  <!-- 상단 경보 헤더 -->
  <rect x="0" y="0" width="460" height="48" rx="16" fill="${style.headerBg}"/>
  <rect x="0" y="24" width="460" height="24" fill="${style.headerBg}"/>
  <text x="24" y="31" fill="#ffffff" font-size="16" font-weight="bold" font-family="sans-serif">${style.label}</text>
  <rect x="360" y="12" width="76" height="24" rx="12" fill="rgba(255,255,255,0.2)"/>
  <text x="398" y="28" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">${(broadcast.severity || 'advisory').toUpperCase()}</text>

  <text x="24" y="85" fill="#64748b" font-size="12" font-family="sans-serif">공고명</text>
  <text x="24" y="108" fill="#0f172a" font-size="17" font-weight="bold" font-family="sans-serif">${safeTitle}</text>
  
  <text x="24" y="145" fill="#64748b" font-size="12" font-family="sans-serif">적용 기간</text>
  <text x="24" y="165" fill="#334155" font-size="13" font-weight="bold" font-family="sans-serif">${safeStartDate} ~ ${safeEndDate}</text>

  <text x="24" y="200" fill="#64748b" font-size="12" font-family="sans-serif">휴원/조치 사유</text>
  <text x="24" y="220" fill="#dc2626" font-size="13" font-weight="bold" font-family="sans-serif">${safeReason}</text>

  <line x1="24" y1="240" x2="436" y2="240" stroke="#f1f5f9" stroke-width="1.5"/>
  <text x="230" y="262" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="sans-serif">모아 안심 안전 네트워크 • 원생 안전 최우선 긴급 조치</text>
</svg>`;
}

/**
 * 0원 학부모 단톡방/SMS/카카오톡 긴급 공지 텍스트 템플릿
 */
export function formatEmergencyBroadcastText(broadcast: EmergencyBroadcastItem, orgName: string): string {
  const style = getSeverityStyle(broadcast.severity);
  const startPeriod = (broadcast.effectiveStart || new Date().toISOString()).slice(0, 16).replace('T', ' ');
  const endPeriod = broadcast.effectiveEnd ? `~ ${broadcast.effectiveEnd.slice(0, 16).replace('T', ' ')}` : '(상황 종료 시까지)';
  const makeupText = broadcast.makeupPolicyNotice ? `\n- 보강/수업 안내: ${broadcast.makeupPolicyNotice}` : '';

  return `[${orgName}] ${style.label} 안내

안녕하세요, ${orgName}입니다.
원생과 회원의 안전을 위해 아래와 같이 긴급 휴원/휴관 조치를 결정하게 되었습니다.

- 제목: ${broadcast.title}
- 사유: ${broadcast.closureReason}
- 적용 일시: ${startPeriod} ${endPeriod}${makeupText}
- 모바일 수신 확인 링크: https://moa.app/alert/${broadcast.id}

안내를 확인하신 학부모님/회원님께서는 위 링크를 눌러 [확인 완료] 버튼을 눌러주시면 감사하겠습니다. 아이들의 안전을 최우선으로 돌보겠습니다. 감사합니다.`;
}
