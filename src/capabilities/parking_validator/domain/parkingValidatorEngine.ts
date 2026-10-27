/**
 * parking_validator 도메인 비즈니스 엔진
 * 고객 무료 주차 등록 & 상가 주차권 정산기
 */

export type ParkingTicketType = '30min' | '1hour' | '2hour' | '3hour' | 'allday';
export type ParkingRegistrationStatus = 'active' | 'exited' | 'cancelled';

export interface ParkingBatchItem {
  id: string;
  organizationId: string;
  batchName: string;
  ticketType: ParkingTicketType;
  allocatedMinutes: number;
  unitCost: number;
  purchasedQuantity: number;
  usedQuantity: number;
  purchasedDate: string;
  expiresDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParkingRegistrationItem {
  id: string;
  organizationId: string;
  batchId?: string | null;
  vehicleNumber: string;
  visitorName: string;
  visitorRole: string;
  purpose: string;
  registeredAt: string;
  freeMinutes: number;
  ticketsUsed: number;
  status: ParkingRegistrationStatus;
  memo?: string | null;
  createdAt: string;
}

/**
 * 차량 번호 4자리 또는 전체 번호 정규화
 */
export function normalizeVehicleNumber(input: string): string {
  return input.trim().replace(/\s+/g, '');
}

/**
 * 체류 예정 시간(분)과 권종 분(분)에 따른 소요 주차권 수량 계산
 */
export function calculateRequiredTickets(stayMinutes: number, ticketMinutes: number): number {
  if (stayMinutes <= 0 || ticketMinutes <= 0) return 0;
  return Math.ceil(stayMinutes / ticketMinutes);
}

/**
 * 주차권 잔여 재고 계산
 */
export function getBatchRemainingQuantity(batch: {
  purchasedQuantity: number;
  usedQuantity: number;
}): number {
  return Math.max(0, batch.purchasedQuantity - batch.usedQuantity);
}

/**
 * 0원 W3C SVG 모바일 전자 주차 확인증 생성
 */
export function renderParkingPassSvg(reg: ParkingRegistrationItem, allocatedMinutes: number): string {
  const safeVehicle = normalizeVehicleNumber(reg.vehicleNumber)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeName = (reg.visitorName || '방문객')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safePurpose = (reg.purpose || '방문')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeDate = (reg.registeredAt || new Date().toISOString()).slice(0, 16).replace('T', ' ');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 250" width="100%" height="100%">
  <rect width="420" height="250" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="0" y="0" width="420" height="46" rx="16" fill="#1e293b"/>
  <rect x="0" y="26" width="420" height="20" fill="#1e293b"/>
  <text x="24" y="30" fill="#ffffff" font-size="15" font-weight="bold" font-family="sans-serif">🅿️ 무료 주차 등록 확인증</text>
  <rect x="320" y="12" width="76" height="24" rx="12" fill="#10b981"/>
  <text x="358" y="28" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">등록완료</text>
  
  <text x="24" y="80" fill="#64748b" font-size="12" font-family="sans-serif">차량 번호</text>
  <text x="24" y="112" fill="#0f172a" font-size="24" font-weight="bold" font-family="sans-serif">${safeVehicle}</text>
  
  <text x="220" y="80" fill="#64748b" font-size="12" font-family="sans-serif">무료 제공 시간</text>
  <text x="220" y="112" fill="#0284c7" font-size="22" font-weight="bold" font-family="sans-serif">${allocatedMinutes}분 무료</text>

  <line x1="24" y1="135" x2="396" y2="135" stroke="#f1f5f9" stroke-width="1.5"/>

  <text x="24" y="165" fill="#64748b" font-size="12" font-family="sans-serif">방문자: <tspan fill="#334155" font-weight="bold">${safeName} (${reg.visitorRole || '방문객'})</tspan></text>
  <text x="24" y="190" fill="#64748b" font-size="12" font-family="sans-serif">등록일시: ${safeDate}</text>
  <text x="220" y="165" fill="#64748b" font-size="12" font-family="sans-serif">방문목적: ${safePurpose}</text>
  <text x="220" y="190" fill="#64748b" font-size="12" font-family="sans-serif">적용 주차권: ${reg.ticketsUsed || 1}매 차감</text>

  <text x="210" y="230" fill="#94a3b8" font-size="10" text-anchor="middle" font-family="sans-serif">Moa Smart Parking • 무인 정산기 자동 출차 연동</text>
</svg>`;
}

/**
 * 0원 카톡/SMS 주차 등록 안내 메시지 조립
 */
export function formatParkingNotificationText(reg: ParkingRegistrationItem, freeMinutes: number): string {
  const safeDate = (reg.registeredAt || new Date().toISOString()).slice(0, 16).replace('T', ' ');
  return `[무료 주차 등록 안내]
안녕하세요, ${reg.visitorName || '고객'}님.
방문 매장에서 주차 할인이 정상 등록되었습니다.

- 등록 차량: ${reg.vehicleNumber}
- 할인 시간: ${freeMinutes}분 무료
- 등록 일시: ${safeDate}
- 주차권 적용: ${reg.ticketsUsed || 1}장

무료 시간 초과 시 사전 무인정산기에서 추가 요금을 결제 후 출차해 주시기 바랍니다. 안전운전 되세요!`;
}
