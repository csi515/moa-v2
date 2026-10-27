import {
  WorkOrderItem,
  calculateWorkOrderInvoice,
  advanceWorkOrderStage,
  summarizeWorkOrderKanban,
} from './workOrderKanbanEngine';

function runTests() {
  console.log('--- Testing workOrderKanbanEngine ---');

  // Test 1: 부품비 + 공임비 + 부가세 10% 견적서 계산
  const repairOrder: WorkOrderItem = {
    id: 'wo-1',
    orderNumber: 'WO-202610-001',
    targetItemName: '제네시스 G80 (12가 3456)',
    customerName: '홍길동',
    customerPhone: '010-1234-5678',
    stage: 'IN_PROGRESS',
    assignedMechanic: '김정비 팀장',
    diagnosis: '브레이크 디스크 마모 및 엔진오일 교환',
    parts: [
      {
        id: 'p-1',
        partName: '전륜 세라믹 브레이크 패드',
        quantity: 2,
        unitPrice: 120000, // 240,000원
      },
      {
        id: 'p-2',
        partName: '합성 엔진오일 6L',
        quantity: 1,
        unitPrice: 90000, // 90,000원
      },
    ],
    laborFee: 150000, // 기술공임 150,000원
    createdAt: '2026-10-14T09:00:00Z',
  };

  const invoice = calculateWorkOrderInvoice(repairOrder);
  // 부품비 합계: 240,000 + 90,000 = 330,000원
  if (invoice.totalPartsFee !== 330000) {
    throw new Error(`Expected parts fee 330,000, got ${invoice.totalPartsFee}`);
  }
  // 공급가액: 330,000 + 150,000 = 480,000원
  if (invoice.subtotal !== 480000) {
    throw new Error(`Expected subtotal 480,000, got ${invoice.subtotal}`);
  }
  // 부가세 10%: 48,000원
  if (invoice.vat !== 48000) {
    throw new Error(`Expected vat 48,000, got ${invoice.vat}`);
  }
  // 최종 합계: 528,000원
  if (invoice.grandTotal !== 528000) {
    throw new Error(`Expected grandTotal 528,000, got ${invoice.grandTotal}`);
  }
  console.log('✅ Test 1 passed: Work order parts and labor invoice calculation');

  // Test 2: 단계 전이
  const advanced = advanceWorkOrderStage(repairOrder, 'INSPECTION');
  if (advanced.stage !== 'INSPECTION') {
    throw new Error(`Expected INSPECTION stage, got ${advanced.stage}`);
  }
  console.log('✅ Test 2 passed: Work order stage advancement');

  // Test 3: 칸반 요약 집계
  const completedOrder: WorkOrderItem = {
    ...repairOrder,
    id: 'wo-2',
    stage: 'COMPLETED',
  };
  const summary = summarizeWorkOrderKanban([repairOrder, completedOrder]);
  if (summary.totalOrders !== 2) {
    throw new Error(`Expected 2 orders, got ${summary.totalOrders}`);
  }
  if (summary.inProgressCount !== 1) {
    throw new Error(`Expected 1 in-progress, got ${summary.inProgressCount}`);
  }
  if (summary.completedCount !== 1) {
    throw new Error(`Expected 1 completed, got ${summary.completedCount}`);
  }
  if (summary.activeCount !== 1) {
    throw new Error(`Expected 1 active, got ${summary.activeCount}`);
  }
  console.log('✅ Test 3 passed: Kanban summary metrics');

  console.log('🎉 All workOrderKanbanEngine tests passed!');
}

runTests();
