/**
 * 테이블 QR 주문 및 주방 디스플레이 시스템 (KDS) 순수 도메인 엔진
 *
 * 대상 업종: 외식·식음 5종 (카페, 레스토랑, 스터디카페 푸드존, 복합 문화공간 등)
 * 주요 기능:
 *  1. 테이블 번호 기반 주문 티켓 정규화 및 총액 산출
 *  2. 주방 KDS 상태머신 (SUBMITTED -> RECEIVED -> COOKING -> READY -> SERVED / CANCELLED)
 *  3. 조리 경과 시간(분) 및 주방 병목/지연 지표 산출
 */

export type TableOrderStatus =
  | 'SUBMITTED' // 모바일 QR 주문 제출됨
  | 'RECEIVED' // 주방에서 주문 접수함
  | 'COOKING' // 조리 시작
  | 'READY' // 조리 완료 (홀 서빙 호출)
  | 'SERVED' // 서빙 및 테이블 전달 완료
  | 'CANCELLED'; // 취소됨

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  options?: string[]; // e.g. ["샷 추가", "덜 달게", "얼음 많이"]
}

export interface RawOrderInput {
  tableNumber: string | number;
  items: OrderItem[];
  customerNote?: string;
  submittedAt?: string; // ISO string
}

export interface TableOrderTicket {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  totalQuantity: number;
  totalAmount: number;
  customerNote?: string;
  status: TableOrderStatus;
  submittedAt: string;
  receivedAt?: string;
  cookingStartedAt?: string;
  readyAt?: string;
  servedAt?: string;
}

export interface KitchenMetrics {
  totalActiveTickets: number;
  waitingCount: number; // SUBMITTED or RECEIVED
  cookingCount: number; // COOKING
  readyCount: number; // READY
  overdueTicketsCount: number; // 15분 이상 경과된 주문
  averageCookingMinutes: number;
}

/**
 * 1. 신규 주문 티켓 생성 및 유효성 검증 (순수 함수)
 */
export function createTableOrderTicket(
  ticketId: string,
  raw: RawOrderInput
): TableOrderTicket {
  const tableNumber = String(raw.tableNumber).trim() || '홀-1';
  const validItems = (raw.items || []).filter((i) => i.quantity > 0);

  if (validItems.length === 0) {
    throw new Error('주문 항목이 최소 1개 이상이어야 합니다.');
  }

  let totalQuantity = 0;
  let totalAmount = 0;

  validItems.forEach((item) => {
    totalQuantity += item.quantity;
    totalAmount += item.quantity * item.unitPrice;
  });

  const submittedAt = raw.submittedAt || new Date().toISOString();

  return {
    id: ticketId,
    tableNumber,
    items: validItems,
    totalQuantity,
    totalAmount,
    customerNote: raw.customerNote?.trim() || undefined,
    status: 'SUBMITTED',
    submittedAt,
  };
}

/**
 * 2. 상태 머신 전이 규칙 및 유효성 검증 (순수 함수)
 */
const VALID_TRANSITIONS: Record<TableOrderStatus, readonly TableOrderStatus[]> = {
  SUBMITTED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['COOKING', 'CANCELLED'],
  COOKING: ['READY', 'CANCELLED'],
  READY: ['SERVED', 'CANCELLED'],
  SERVED: [],
  CANCELLED: [],
};

export function advanceTicketStatus(
  ticket: TableOrderTicket,
  nextStatus: TableOrderStatus,
  timestamp?: string
): TableOrderTicket {
  const allowed = VALID_TRANSITIONS[ticket.status];
  if (!allowed.includes(nextStatus)) {
    throw new Error(
      `유효하지 않은 상태 전이입니다: ${ticket.status} -> ${nextStatus}`
    );
  }

  const ts = timestamp || new Date().toISOString();
  const updated: TableOrderTicket = {
    ...ticket,
    status: nextStatus,
  };

  if (nextStatus === 'RECEIVED') updated.receivedAt = ts;
  else if (nextStatus === 'COOKING') updated.cookingStartedAt = ts;
  else if (nextStatus === 'READY') updated.readyAt = ts;
  else if (nextStatus === 'SERVED') updated.servedAt = ts;

  return updated;
}

/**
 * 3. 주문 티켓의 현재 경과 시간(분) 계산 (순수 함수)
 */
export function calculateElapsedMinutes(
  submittedAtIso: string,
  currentTimestampIso: string
): number {
  const subMs = new Date(submittedAtIso).getTime();
  const curMs = new Date(currentTimestampIso).getTime();
  return Math.max(0, Math.floor((curMs - subMs) / (1000 * 60)));
}

/**
 * 4. 주방 KDS 실시간 공정 지표 집계 (순수 함수)
 */
export function calculateKitchenMetrics(
  tickets: readonly TableOrderTicket[],
  currentTimestampIso: string,
  overdueThresholdMinutes = 15
): KitchenMetrics {
  const activeTickets = tickets.filter(
    (t) => t.status !== 'SERVED' && t.status !== 'CANCELLED'
  );

  let waitingCount = 0;
  let cookingCount = 0;
  let readyCount = 0;
  let overdueTicketsCount = 0;
  let totalElapsedMinutes = 0;

  for (const t of activeTickets) {
    const elapsed = calculateElapsedMinutes(t.submittedAt, currentTimestampIso);
    totalElapsedMinutes += elapsed;

    if (elapsed >= overdueThresholdMinutes) {
      overdueTicketsCount++;
    }

    if (t.status === 'SUBMITTED' || t.status === 'RECEIVED') {
      waitingCount++;
    } else if (t.status === 'COOKING') {
      cookingCount++;
    } else if (t.status === 'READY') {
      readyCount++;
    }
  }

  const averageCookingMinutes =
    activeTickets.length > 0
      ? Math.round((totalElapsedMinutes / activeTickets.length) * 10) / 10
      : 0;

  return {
    totalActiveTickets: activeTickets.length,
    waitingCount,
    cookingCount,
    readyCount,
    overdueTicketsCount,
    averageCookingMinutes,
  };
}
