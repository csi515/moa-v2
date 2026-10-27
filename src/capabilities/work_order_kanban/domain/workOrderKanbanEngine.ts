/**
 * 정비·수리 단계별 작업지시서 & 부품 공임 견적서 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 자동차 정비소(auto_repair), 공방·수리점(craft_repair), 대여장비 수리소
 *
 * 주요 기능:
 *  1. 입고 점검 진단 내역 및 사용 부품/공임비 합산 견적서(Invoice) 산출
 *  2. 5단계 작업지시서 칸반 공정 전이 (RECEIVED -> PARTS_WAITING -> IN_PROGRESS -> INSPECTION -> COMPLETED)
 *  3. 공정 단계별 병목 집계 및 미출고 차량/물품 수량 통계
 */

export type WorkOrderStage =
  | 'RECEIVED' // 입고/진단 완료
  | 'PARTS_WAITING' // 부품/자재 대기
  | 'IN_PROGRESS' // 정비/수리 진행 중
  | 'INSPECTION' // 검수 및 시운전
  | 'COMPLETED'; // 수리 완료/출고 대기

export interface WorkOrderPart {
  id: string;
  partName: string; // e.g. "정품 브레이크 패드 (전륜)", "합성 엔진오일 5W-30"
  quantity: number;
  unitPrice: number;
}

export interface WorkOrderItem {
  id: string;
  orderNumber: string; // e.g. "WO-202610-001"
  targetItemName: string; // 차량명(번호판) 또는 수리 제품명
  customerName: string;
  customerPhone: string;
  stage: WorkOrderStage;
  assignedMechanic: string;
  diagnosis: string;
  parts: WorkOrderPart[];
  laborFee: number; // 기술 공임비
  createdAt: string;
  completedAt?: string;
}

export interface WorkOrderInvoiceSummary {
  orderNumber: string;
  totalPartsFee: number;
  laborFee: number;
  subtotal: number;
  vat: number; // 부가세 10%
  grandTotal: number;
}

export interface WorkOrderKanbanSummary {
  totalOrders: number;
  receivedCount: number;
  partsWaitingCount: number;
  inProgressCount: number;
  inspectionCount: number;
  completedCount: number;
  activeCount: number;
}

/**
 * 1. 부품비 + 기술공임 + 부가세(10%) 투명 견적서 산출 (순수 함수)
 */
export function calculateWorkOrderInvoice(order: WorkOrderItem): WorkOrderInvoiceSummary {
  let totalPartsFee = 0;
  for (const p of order.parts) {
    totalPartsFee += p.quantity * p.unitPrice;
  }

  const subtotal = totalPartsFee + order.laborFee;
  const vat = Math.round(subtotal * 0.1);
  const grandTotal = subtotal + vat;

  return {
    orderNumber: order.orderNumber,
    totalPartsFee,
    laborFee: order.laborFee,
    subtotal,
    vat,
    grandTotal,
  };
}

/**
 * 2. 공정 단계 전이 (순수 함수)
 */
export function advanceWorkOrderStage(
  order: WorkOrderItem,
  nextStage: WorkOrderStage,
  timestamp = new Date().toISOString()
): WorkOrderItem {
  return {
    ...order,
    stage: nextStage,
    completedAt: nextStage === 'COMPLETED' ? timestamp : undefined,
  };
}

/**
 * 3. 칸반 단계별 진행 집계 요약 (순수 함수)
 */
export function summarizeWorkOrderKanban(
  orders: readonly WorkOrderItem[]
): WorkOrderKanbanSummary {
  let receivedCount = 0;
  let partsWaitingCount = 0;
  let inProgressCount = 0;
  let inspectionCount = 0;
  let completedCount = 0;

  for (const o of orders) {
    if (o.stage === 'RECEIVED') receivedCount++;
    else if (o.stage === 'PARTS_WAITING') partsWaitingCount++;
    else if (o.stage === 'IN_PROGRESS') inProgressCount++;
    else if (o.stage === 'INSPECTION') inspectionCount++;
    else if (o.stage === 'COMPLETED') completedCount++;
  }

  const activeCount = receivedCount + partsWaitingCount + inProgressCount + inspectionCount;

  return {
    totalOrders: orders.length,
    receivedCount,
    partsWaitingCount,
    inProgressCount,
    inspectionCount,
    completedCount,
    activeCount,
  };
}
