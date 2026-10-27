/**
 * 사전 예약 주문 & 픽업 4단계 칸반 파이프라인 도메인 엔진 (Pure Functions)
 *
 * 적용 대상:
 *  - 플라워샵: 기념일 꽃다발/화환 예약 픽업
 *  - 베이커리/디저트: 맞춤 레터링 케이크, 수제 쿠키 세트
 *  - 주문 제작 공방: 가죽 각인 지갑, 도자기 완성품 수령
 *
 * 4단계 상태 전이 라이프사이클:
 *  RECEIVED (접수) -> PREPARING (제작 중) -> READY_FOR_PICKUP (픽업 대기/고객 알림) -> COMPLETED (수령 완료)
 */

export type PickupStage =
  | 'RECEIVED' // 주문 접수
  | 'PREPARING' // 제작/준비 중
  | 'READY_FOR_PICKUP' // 픽업 대기 (수령 안내 알림 발송 가능)
  | 'COMPLETED' // 고객 수령 완료
  | 'CANCELLED'; // 주문 취소

export interface PickupOrderItem {
  itemId?: string;
  name: string; // e.g. "시그니처 파스텔 생화 꽃다발", "딸기 생크림 케이크 1호"
  quantity: number;
  unitPrice: number;
  options?: Record<string, string>; // e.g. { "레터링 문구": "생일 축하해", "포장지 색상": "연분홍" }
}

export interface PickupOrder {
  id: string;
  orderNumber: string; // e.g. "ORD-202610-001"
  customerName: string;
  customerPhone: string;
  items: PickupOrderItem[];
  stage: PickupStage;
  pickupDateTime: string; // ISO String (e.g. "2026-10-20T17:00:00")
  specialRequests?: string;
  totalAmount: number;
  paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
  isNotificationSent?: boolean; // READY_FOR_PICKUP 전환 시 알림 발송 여부
  createdAt: string;
  completedAt?: string;
}

export interface PickupKanbanSummary {
  totalActiveOrders: number;
  receivedCount: number;
  preparingCount: number;
  readyCount: number;
  completedCount: number;
  todayPickupCount: number;
}

export const ALLOWED_PICKUP_TRANSITIONS: Record<PickupStage, PickupStage[]> = {
  RECEIVED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY_FOR_PICKUP', 'CANCELLED'],
  READY_FOR_PICKUP: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * 1. 픽업 주문 칸반 단계 전이 (순수 함수)
 */
export function transitionPickupStage(
  order: PickupOrder,
  nextStage: PickupStage,
  timestamp: string = new Date().toISOString()
): { updatedOrder: PickupOrder; success: boolean; notificationTriggered: boolean; error?: string } {
  if (order.stage === nextStage) {
    return { updatedOrder: order, success: true, notificationTriggered: false };
  }

  const allowed = ALLOWED_PICKUP_TRANSITIONS[order.stage];
  if (!allowed.includes(nextStage)) {
    return {
      updatedOrder: order,
      success: false,
      notificationTriggered: false,
      error: `[${order.stage}] 단계에서 [${nextStage}] 단계로 전이할 수 없습니다.`,
    };
  }

  const isReady = nextStage === 'READY_FOR_PICKUP';
  const isCompleted = nextStage === 'COMPLETED';

  const updated: PickupOrder = {
    ...order,
    stage: nextStage,
    isNotificationSent: isReady ? true : order.isNotificationSent,
    completedAt: isCompleted ? timestamp : order.completedAt,
  };

  return {
    updatedOrder: updated,
    success: true,
    notificationTriggered: isReady,
  };
}

/**
 * 2. 픽업 칸반 통계 및 당일 픽업 예정 집계 (순수 함수)
 */
export function summarizePickupOrders(
  orders: readonly PickupOrder[],
  targetDate: string = new Date().toISOString().slice(0, 10)
): PickupKanbanSummary {
  let receivedCount = 0;
  let preparingCount = 0;
  let readyCount = 0;
  let completedCount = 0;
  let todayPickupCount = 0;

  for (const o of orders) {
    if (o.stage === 'RECEIVED') receivedCount++;
    else if (o.stage === 'PREPARING') preparingCount++;
    else if (o.stage === 'READY_FOR_PICKUP') readyCount++;
    else if (o.stage === 'COMPLETED') completedCount++;

    if (o.stage !== 'CANCELLED' && o.pickupDateTime.startsWith(targetDate)) {
      todayPickupCount++;
    }
  }

  return {
    totalActiveOrders: receivedCount + preparingCount + readyCount,
    receivedCount,
    preparingCount,
    readyCount,
    completedCount,
    todayPickupCount,
  };
}

/**
 * 3. 픽업 임박 주문 감지 (순수 함수)
 *    픽업 예정 시각까지 남은 분(minutes)을 계산하여 30분 이내 임박 주문을 필터링
 */
export function filterUrgentPickups(
  orders: readonly PickupOrder[],
  currentTime: string = new Date().toISOString(),
  thresholdMinutes: number = 60
): PickupOrder[] {
  const currentMs = new Date(currentTime).getTime();

  return orders
    .filter((o) => o.stage === 'RECEIVED' || o.stage === 'PREPARING' || o.stage === 'READY_FOR_PICKUP')
    .filter((o) => {
      const pickupMs = new Date(o.pickupDateTime).getTime();
      const diffMinutes = (pickupMs - currentMs) / (1000 * 60);
      return diffMinutes >= -15 && diffMinutes <= thresholdMinutes;
    })
    .sort((a, b) => new Date(a.pickupDateTime).getTime() - new Date(b.pickupDateTime).getTime());
}
