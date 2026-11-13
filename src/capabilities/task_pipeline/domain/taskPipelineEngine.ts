/**
 * 주문 제작 & 수리 작업 공정 파이프라인 엔진 (Pure Function Domain)
 *
 * 대상: 가죽/도예 맞춤 공방, 세탁/수선소, 자전거/악기 수리점
 * 순수 로직: 단계별 칸반 상태 머신 (RECEIVED -> IN_PROGRESS -> INSPECTION -> READY_FOR_PICKUP -> COMPLETED), 공정 지연(SLA) 감지
 */

import { createStateMachine } from '@/core/fsm/finiteStateMachine';

export type PipelineStage =
  | 'RECEIVED'
  | 'IN_PROGRESS'
  | 'PARTS_WAITING'
  | 'INSPECTION'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';

export const taskPipelineFSM = createStateMachine<PipelineStage, string>({
  domain: 'task_pipeline',
  initialState: 'RECEIVED',
  finalStates: ['COMPLETED', 'CANCELLED'],
  transitions: [
    { from: 'RECEIVED', to: 'IN_PROGRESS', event: 'START_WORK' },
    { from: 'RECEIVED', to: 'PARTS_WAITING', event: 'WAIT_PARTS' },
    { from: 'RECEIVED', to: 'ON_HOLD', event: 'HOLD' },
    { from: 'RECEIVED', to: 'CANCELLED', event: 'CANCEL' },
    { from: 'IN_PROGRESS', to: 'PARTS_WAITING', event: 'WAIT_PARTS' },
    { from: 'IN_PROGRESS', to: 'INSPECTION', event: 'REQUEST_INSPECTION' },
    { from: 'IN_PROGRESS', to: 'ON_HOLD', event: 'HOLD' },
    { from: 'IN_PROGRESS', to: 'CANCELLED', event: 'CANCEL' },
    { from: 'PARTS_WAITING', to: 'IN_PROGRESS', event: 'RESUME_WORK' },
    { from: 'PARTS_WAITING', to: 'ON_HOLD', event: 'HOLD' },
    { from: 'PARTS_WAITING', to: 'CANCELLED', event: 'CANCEL' },
    { from: 'INSPECTION', to: 'READY_FOR_PICKUP', event: 'PASS_INSPECTION' },
    { from: 'INSPECTION', to: 'IN_PROGRESS', event: 'FAIL_INSPECTION' },
    { from: 'INSPECTION', to: 'ON_HOLD', event: 'HOLD' },
    { from: 'INSPECTION', to: 'CANCELLED', event: 'CANCEL' },
    { from: 'READY_FOR_PICKUP', to: 'COMPLETED', event: 'COMPLETE' },
    { from: 'READY_FOR_PICKUP', to: 'ON_HOLD', event: 'HOLD' },
    { from: 'ON_HOLD', to: 'RECEIVED', event: 'UNHOLD' },
    { from: 'ON_HOLD', to: 'IN_PROGRESS', event: 'UNHOLD' },
    { from: 'ON_HOLD', to: 'PARTS_WAITING', event: 'UNHOLD' },
    { from: 'ON_HOLD', to: 'INSPECTION', event: 'UNHOLD' },
    { from: 'ON_HOLD', to: 'CANCELLED', event: 'CANCEL' },
  ],
});

export interface TaskOrder {
  id: string;
  orderNumber: string;
  createdAt?: string;
  orderType?: 'custom_order' | 'repair' | 'manufacturing' | 'maintenance' | 'inspection';
  title: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  targetItemName?: string | null;
  currentStage: PipelineStage;
  stageEnteredAt: string; // ISO String
  assignedStaffId?: string | null;
  assignedStaffName?: string | null;
  slaHoursPerStage?: Partial<Record<PipelineStage, number>>;
  slaHours?: number;
  laborFee?: number;
  partsCost?: number;
  totalAmount?: number;
  diagnosis?: string | null;
  holdReason?: string;
  details?: Record<string, any>;
}

const ALLOWED_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  RECEIVED: ['IN_PROGRESS', 'PARTS_WAITING', 'ON_HOLD', 'CANCELLED'],
  IN_PROGRESS: ['PARTS_WAITING', 'INSPECTION', 'ON_HOLD', 'CANCELLED'],
  PARTS_WAITING: ['IN_PROGRESS', 'ON_HOLD', 'CANCELLED'],
  INSPECTION: ['READY_FOR_PICKUP', 'IN_PROGRESS', 'ON_HOLD', 'CANCELLED'], // 불합격 시 IN_PROGRESS 재진입
  READY_FOR_PICKUP: ['COMPLETED', 'ON_HOLD'],
  COMPLETED: [], // 최종 완료
  ON_HOLD: ['RECEIVED', 'IN_PROGRESS', 'PARTS_WAITING', 'INSPECTION', 'CANCELLED'], // 보류 해제
  CANCELLED: [],
};

export function transitionTaskPipelineStage(
  order: TaskOrder,
  targetStage: PipelineStage,
  timestamp: string = new Date(Date.now()).toISOString(),
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

/**
 * 3. 팀원별 업무 부하(Workload Clumping) 산출 및 경고 판정 (Pure Function)
 * - 3건 이하: 정상 (NORMAL)
 * - 4건: 주의/경고 (WARNING - Yellow Alert)
 * - 5건 이상: 과부하/병목 위험 (CRITICAL - Red Alert)
 */
export interface StaffWorkloadSummary {
  staffId: string;
  staffName: string;
  activeTaskCount: number;
  overdueTaskCount: number;
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
  assignedTasks: TaskOrder[];
}

export function calculateStaffWorkload(
  orders: TaskOrder[],
  warningThreshold: number = 4,
  criticalThreshold: number = 5,
  currentTime: string = new Date(Date.now()).toISOString()
): StaffWorkloadSummary[] {
  const staffMap = new Map<string, { name: string; tasks: TaskOrder[] }>();

  // 완료/취소 제외 활성 작업만 필터링
  const activeOrders = orders.filter(
    (o) => o.currentStage !== 'COMPLETED' && o.currentStage !== 'CANCELLED'
  );

  activeOrders.forEach((o) => {
    const sId = o.assignedStaffId || 'unassigned';
    const sName = o.assignedStaffName || '미지정';
    if (!staffMap.has(sId)) {
      staffMap.set(sId, { name: sName, tasks: [] });
    }
    staffMap.get(sId)!.tasks.push(o);
  });

  const nowIso = currentTime;
  const result: StaffWorkloadSummary[] = [];

  staffMap.forEach(({ name, tasks }, staffId) => {
    const activeCount = tasks.length;
    let overdueCount = 0;

    tasks.forEach((t) => {
      const sla = t.slaHours || 24;
      const evalResult = evaluateStageSla({
        stageEnteredAt: t.stageEnteredAt,
        slaHours: sla,
        currentTime: nowIso,
      });
      if (evalResult.isBreached) {
        overdueCount++;
      }
    });

    let alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';
    if (activeCount >= criticalThreshold || overdueCount >= 2) {
      alertLevel = 'CRITICAL';
    } else if (activeCount >= warningThreshold || overdueCount >= 1) {
      alertLevel = 'WARNING';
    }

    result.push({
      staffId,
      staffName: name,
      activeTaskCount: activeCount,
      overdueTaskCount: overdueCount,
      alertLevel,
      assignedTasks: tasks,
    });
  });

  return result.sort((a, b) => b.activeTaskCount - a.activeTaskCount);
}

/**
 * 4. 공정별 병목(Stage Bottlenecks) 실시간 진단
 */
export interface StageBottleneckSummary {
  stage: PipelineStage;
  activeTaskCount: number;
  breachedTaskCount: number;
  isBottleneck: boolean;
}

export function detectStageBottlenecks(
  orders: TaskOrder[],
  currentTime: string = new Date(Date.now()).toISOString()
): StageBottleneckSummary[] {
  const stageStats: Record<PipelineStage, { active: number; breached: number }> = {
    RECEIVED: { active: 0, breached: 0 },
    IN_PROGRESS: { active: 0, breached: 0 },
    PARTS_WAITING: { active: 0, breached: 0 },
    INSPECTION: { active: 0, breached: 0 },
    READY_FOR_PICKUP: { active: 0, breached: 0 },
    COMPLETED: { active: 0, breached: 0 },
    ON_HOLD: { active: 0, breached: 0 },
    CANCELLED: { active: 0, breached: 0 },
  };

  orders.forEach((o) => {
    if (o.currentStage === 'COMPLETED' || o.currentStage === 'CANCELLED') return;
    stageStats[o.currentStage].active++;

    const sla = o.slaHours || 24;
    const evalResult = evaluateStageSla({
      stageEnteredAt: o.stageEnteredAt,
      slaHours: sla,
      currentTime,
    });
    if (evalResult.isBreached) {
      stageStats[o.currentStage].breached++;
    }
  });

  // 활성 태스크 수 기준 가장 높은 단계를 병목 후보로 판정
  let maxActive = 0;
  Object.values(stageStats).forEach((s) => {
    if (s.active > maxActive) maxActive = s.active;
  });

  return (Object.keys(stageStats) as PipelineStage[])
    .filter((st) => st !== 'COMPLETED' && st !== 'CANCELLED')
    .map((st) => ({
      stage: st,
      activeTaskCount: stageStats[st].active,
      breachedTaskCount: stageStats[st].breached,
      isBottleneck: maxActive > 0 && stageStats[st].active === maxActive,
    }));
}
