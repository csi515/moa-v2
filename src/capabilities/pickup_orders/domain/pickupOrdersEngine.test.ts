import assert from 'node:assert/strict';
import {
  transitionPickupStage,
  summarizePickupOrders,
  filterUrgentPickups,
  type PickupOrder,
} from './pickupOrdersEngine';

function run() {
  const initialOrder: PickupOrder = {
    id: 'ord-101',
    orderNumber: 'ORD-202610-001',
    customerName: '이지은',
    customerPhone: '010-1234-5678',
    items: [
      {
        name: '시그니처 파스텔 생화 꽃다발',
        quantity: 1,
        unitPrice: 55000,
        options: { 포장: '연분홍 리본' },
      },
    ],
    stage: 'RECEIVED',
    pickupDateTime: '2026-10-20T17:00:00',
    totalAmount: 55000,
    paymentStatus: 'PAID',
    createdAt: '2026-10-20T10:00:00',
  };

  // 1. 유효한 4단계 전이: RECEIVED -> PREPARING
  const t1 = transitionPickupStage(initialOrder, 'PREPARING');
  assert.equal(t1.success, true);
  assert.equal(t1.updatedOrder.stage, 'PREPARING');
  assert.equal(t1.notificationTriggered, false);

  // 2. PREPARING -> READY_FOR_PICKUP (알림 트리거)
  const t2 = transitionPickupStage(t1.updatedOrder, 'READY_FOR_PICKUP');
  assert.equal(t2.success, true);
  assert.equal(t2.updatedOrder.stage, 'READY_FOR_PICKUP');
  assert.equal(t2.notificationTriggered, true);
  assert.equal(t2.updatedOrder.isNotificationSent, true);

  // 3. READY_FOR_PICKUP -> COMPLETED (수령 완료)
  const t3 = transitionPickupStage(t2.updatedOrder, 'COMPLETED', '2026-10-20T17:05:00');
  assert.equal(t3.success, true);
  assert.equal(t3.updatedOrder.stage, 'COMPLETED');
  assert.equal(t3.updatedOrder.completedAt, '2026-10-20T17:05:00');

  // 4. 잘못된 역방향 또는 건너뛰기 전이 방어 (COMPLETED -> PREPARING)
  const invalidT = transitionPickupStage(t3.updatedOrder, 'PREPARING');
  assert.equal(invalidT.success, false);
  assert.ok(invalidT.error?.includes('전이할 수 없습니다'));

  // 5. 칸반 통계 요약
  const orders: PickupOrder[] = [
    initialOrder, // RECEIVED
    { ...initialOrder, id: 'ord-102', stage: 'PREPARING' },
    { ...initialOrder, id: 'ord-103', stage: 'READY_FOR_PICKUP' },
    { ...initialOrder, id: 'ord-104', stage: 'COMPLETED' },
    { ...initialOrder, id: 'ord-105', stage: 'CANCELLED' },
  ];

  const summary = summarizePickupOrders(orders, '2026-10-20');
  assert.equal(summary.totalActiveOrders, 3);
  assert.equal(summary.receivedCount, 1);
  assert.equal(summary.preparingCount, 1);
  assert.equal(summary.readyCount, 1);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.todayPickupCount, 4); // 취소 제외 4건

  // 6. 픽업 임박 주문 필터링 (현재 시각 16:30, 픽업 시각 17:00 -> 30분 남음)
  const urgent = filterUrgentPickups(orders, '2026-10-20T16:30:00', 45);
  assert.equal(urgent.length, 3); // active한 3건 모두 17:00 픽업이므로 매칭

  console.log('pickupOrdersEngine.test.ts: ok');
}

run();
