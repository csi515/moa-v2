import assert from 'node:assert/strict';
import {
  transitionTaskPipelineStage,
  evaluateStageSla,
  type TaskOrder,
} from './taskPipelineEngine';

function run() {
  const order: TaskOrder = {
    id: 'ord-1',
    orderNumber: 'RO-2026-001',
    title: '빈티지 가죽 가방 지퍼 수선',
    customerId: 'cust-1',
    currentStage: 'RECEIVED',
    stageEnteredAt: '2026-06-01T09:00:00Z',
  };

  // 1. 정상 순차 전이 (RECEIVED -> IN_PROGRESS -> INSPECTION -> READY_FOR_PICKUP -> COMPLETED)
  const step1 = transitionTaskPipelineStage(order, 'IN_PROGRESS', '2026-06-01T10:00:00Z');
  assert.equal(step1.success, true);
  assert.equal(step1.updatedOrder.currentStage, 'IN_PROGRESS');

  const step2 = transitionTaskPipelineStage(step1.updatedOrder, 'INSPECTION', '2026-06-02T15:00:00Z');
  assert.equal(step2.success, true);
  assert.equal(step2.updatedOrder.currentStage, 'INSPECTION');

  const step3 = transitionTaskPipelineStage(step2.updatedOrder, 'READY_FOR_PICKUP', '2026-06-03T11:00:00Z');
  assert.equal(step3.success, true);
  assert.equal(step3.updatedOrder.currentStage, 'READY_FOR_PICKUP');

  const step4 = transitionTaskPipelineStage(step3.updatedOrder, 'COMPLETED', '2026-06-03T18:00:00Z');
  assert.equal(step4.success, true);
  assert.equal(step4.updatedOrder.currentStage, 'COMPLETED');

  // 2. 비정상 전이 방어 (COMPLETED 상태에서 RECEIVED로 바로 점프 불가)
  const invalidJump = transitionTaskPipelineStage(step4.updatedOrder, 'RECEIVED');
  assert.equal(invalidJump.success, false);

  // 3. 검수 불합격 시 재작업(IN_PROGRESS) 되돌림 허용
  const inspectionOrder: TaskOrder = {
    ...order,
    currentStage: 'INSPECTION',
  };
  const rework = transitionTaskPipelineStage(inspectionOrder, 'IN_PROGRESS', '2026-06-02T16:00:00Z');
  assert.equal(rework.success, true);
  assert.equal(rework.updatedOrder.currentStage, 'IN_PROGRESS');

  // 4. SLA 지연 감지 (기준 24시간, 10시간 경과 -> 정상)
  const onTimeSla = evaluateStageSla({
    stageEnteredAt: '2026-06-01T09:00:00Z',
    slaHours: 24,
    currentTime: '2026-06-01T19:00:00Z', // 10시간 경과
  });
  assert.equal(onTimeSla.isBreached, false);
  assert.equal(onTimeSla.elapsedHours, 10);
  assert.equal(onTimeSla.remainingHours, 14);

  // 5. SLA 지연 감지 (기준 24시간, 30시간 경과 -> 지연 Breached)
  const breachedSla = evaluateStageSla({
    stageEnteredAt: '2026-06-01T09:00:00Z',
    slaHours: 24,
    currentTime: '2026-06-02T15:00:00Z', // 30시간 경과
  });
  assert.equal(breachedSla.isBreached, true);
  assert.equal(breachedSla.elapsedHours, 30);
  assert.equal(breachedSla.remainingHours, -6);

  console.log('taskPipelineEngine.test.ts: ok');
}

run();
