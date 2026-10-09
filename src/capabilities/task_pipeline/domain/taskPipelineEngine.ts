/**
 * 주문 제작 & 수리 작업 공정 파이프라인 엔진 (Pure Function Domain)
 *
 * 대상: 가죽/도예 맞춤 공방, 세탁/수선소, 자전거/악기 수리점
 * 순수 로직: 단계별 칸반 상태 머신 (RECEIVED -> IN_PROGRESS -> INSPECTION -> READY_FOR_PICKUP -> COMPLETED), 공정 지연(SLA) 감지
 */

export type PipelineStage =
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'INSPECTION'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export interface TaskOrder {
  id: string;
  orderNumber: string;
  title: string;
  customerId: string;
  currentStage: PipelineStage;
  stageEnteredAt: string; // ISO String
  slaHoursPerStage?: Partial<Record<PipelineStage, number>>;
  holdReason?: string;
}

const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  RECEIVED: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['INSPECTION', 'ON_HOLD', 'CANCELLED'],
  INSPECTION: ['READY_FOR_PICKUP', 'IN_PROGRESS', 'ON_HOLD', 'CANCELLED'], // 불합격 시 IN_PROGRESS 재진입
  READY_FOR_PICKUP: ['COMPLETED', 'ON_HOLD'],
  COMPLETED: [], // 최종 완료
  ON_HOLD: ['RECEIVED', 'IN_PROGRESS', 'INSPECTION', 'CANCELLED'], // 보류 해제
  CANCELLED: [],
};

export function transitionTaskPipelineStage(
  order: TaskOrder,
  targetStage: PipelineStage,
  timestamp: string = new Date().toISOString(),
  reason?: string
): { updatedOrder: TaskOrder; success: boolean; error?: string } {
  const allowed = ALLOWED_TRANSITIONS[order.currentStage];
  if (!allowed.includes(targetStage)) {
    return {
      updatedOrder: order,
      success: false,
      error: `전이 불가능한 공정 단계입니다: ${order.currentStage} -> ${targetStage}`,
    };
  }

  return {
    updatedOrder: {
      ...order,
      currentStage: targetStage,
      stageEnteredAt: timestamp,
      holdReason: targetStage === 'ON_HOLD' ? reason : undefined,
    },
    success: true,
  };
}

export interface SlaBreachEvaluationResult {
  isBreached: boolean;
  elapsedHours: number;
  slaHours: number;
  remainingHours: number;
}

export function evaluateStageSla(params: {
  stageEnteredAt: string;
  slaHours: number;
  currentTime: string;
}): SlaBreachEvaluationResult {
  const entered = new Date(params.stageEnteredAt).getTime();
  const current = new Date(params.currentTime).getTime();

  const elapsedMs = Math.max(0, current - entered);
  const elapsedHours = Number((elapsedMs / (1000 * 3600)).toFixed(1));
  const remainingHours = Number((params.slaHours - elapsedHours).toFixed(1));

  return {
    isBreached: elapsedHours > params.slaHours,
    elapsedHours,
    slaHours: params.slaHours,
    remainingHours,
  };
}
