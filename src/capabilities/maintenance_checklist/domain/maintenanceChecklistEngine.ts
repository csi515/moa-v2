/**
 * 매장 시설 점검 & 일일 루틴 엔진 (Pure Function Domain)
 *
 * 대상: 사우나 수온/수질, 헬스장 소독, 무인 매장 오픈/마감 청소 상태
 * 기능: 점검 항목 완료율 계산, 미완료 누락 항목 경고 플래그 판정식
 */

export interface ChecklistItem {
  id: string;
  title: string;
  isRequired: boolean;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
  numericValue?: number;
  minThreshold?: number;
  maxThreshold?: number;
}

export interface ChecklistProgressResult {
  totalCount: number;
  completedCount: number;
  requiredCount: number;
  requiredCompletedCount: number;
  ratePercent: number;
  isRequiredFulfilled: boolean;
}

export function calculateChecklistProgress(
  items: ChecklistItem[]
): ChecklistProgressResult {
  if (items.length === 0) {
    return {
      totalCount: 0,
      completedCount: 0,
      requiredCount: 0,
      requiredCompletedCount: 0,
      ratePercent: 100,
      isRequiredFulfilled: true,
    };
  }

  const totalCount = items.length;
  const completedCount = items.filter((i) => i.isCompleted).length;
  const requiredItems = items.filter((i) => i.isRequired);
  const requiredCount = requiredItems.length;
  const requiredCompletedCount = requiredItems.filter((i) => i.isCompleted).length;

  const ratePercent = Math.round((completedCount / totalCount) * 100);
  const isRequiredFulfilled = requiredCount === requiredCompletedCount;

  return {
    totalCount,
    completedCount,
    requiredCount,
    requiredCompletedCount,
    ratePercent,
    isRequiredFulfilled,
  };
}

export interface UrgencyEvaluationParams {
  items: ChecklistItem[];
  deadlineTime: string; // ISO String or HH:mm
  currentTime: string; // ISO String or HH:mm
}

export interface UrgencyEvaluationResult {
  hasMissingRequired: boolean;
  missingRequiredItemIds: string[];
  isDeadlinePassed: boolean;
  hasOutOfRangeValues: boolean;
  outOfRangeItemIds: string[];
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export function evaluateChecklistUrgency(
  params: UrgencyEvaluationParams
): UrgencyEvaluationResult {
  const { items, deadlineTime, currentTime } = params;

  // 필수 미완료 항목
  const missingRequired = items.filter((i) => i.isRequired && !i.isCompleted);
  const missingRequiredItemIds = missingRequired.map((i) => i.id);
  const hasMissingRequired = missingRequiredItemIds.length > 0;

  // 마감 시간 초과 판정
  const isDeadlinePassed = currentTime > deadlineTime;

  // 임계값 초과/미달 항목 판정 (온도, 수질 등)
  const outOfRange = items.filter((i) => {
    if (!i.isCompleted || i.numericValue === undefined) return false;
    if (i.minThreshold !== undefined && i.numericValue < i.minThreshold) return true;
    if (i.maxThreshold !== undefined && i.numericValue > i.maxThreshold) return true;
    return false;
  });
  const outOfRangeItemIds = outOfRange.map((i) => i.id);
  const hasOutOfRangeValues = outOfRangeItemIds.length > 0;

  let alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' = 'NORMAL';

  if (hasOutOfRangeValues || (isDeadlinePassed && hasMissingRequired)) {
    alertLevel = 'CRITICAL';
  } else if (hasMissingRequired) {
    alertLevel = 'WARNING';
  }

  return {
    hasMissingRequired,
    missingRequiredItemIds,
    isDeadlinePassed,
    hasOutOfRangeValues,
    outOfRangeItemIds,
    alertLevel,
  };
}

// ============================================================================
// 정량 수치 허용 공차(Tolerance) 판정 & CAPA 자동 연계 엔진
// ============================================================================

export interface ToleranceCheckParams {
  itemId: string;
  itemTitle: string;
  numericValue: number;
  minAllowed?: number;
  maxAllowed?: number;
  targetValue?: number;
  unit?: string; // e.g. "℃", "bar", "ppm"
}

export interface ToleranceCheckResult {
  itemId: string;
  isPassed: boolean;
  status: 'PASS' | 'FAIL_LOW' | 'FAIL_HIGH';
  deviation: number;
  message: string;
}

/**
 * 정량적 측정 항목의 허용 공차(Tolerance) 자동 판정 (순수 함수)
 */
export function evaluateToleranceResult(
  params: ToleranceCheckParams
): ToleranceCheckResult {
  const { itemId, numericValue, minAllowed, maxAllowed, targetValue, unit = '' } = params;

  if (minAllowed !== undefined && numericValue < minAllowed) {
    const deviation = Math.round((numericValue - minAllowed) * 100) / 100;
    return {
      itemId,
      isPassed: false,
      status: 'FAIL_LOW',
      deviation,
      message: `허용 하한값(${minAllowed}${unit}) 미달 (측정치: ${numericValue}${unit}, 편차: ${deviation}${unit})`,
    };
  }

  if (maxAllowed !== undefined && numericValue > maxAllowed) {
    const deviation = Math.round((numericValue - maxAllowed) * 100) / 100;
    return {
      itemId,
      isPassed: false,
      status: 'FAIL_HIGH',
      deviation,
      message: `허용 상한값(${maxAllowed}${unit}) 초과 (측정치: ${numericValue}${unit}, 편차: +${deviation}${unit})`,
    };
  }

  const deviation = targetValue !== undefined ? Math.round((numericValue - targetValue) * 100) / 100 : 0;
  return {
    itemId,
    isPassed: true,
    status: 'PASS',
    deviation,
    message: `허용 공차 기준 합격 (${numericValue}${unit})`,
  };
}

export interface CapaTicketDraft {
  ticketNumber: string;
  checklistItemId: string;
  checklistItemTitle: string;
  failureReason: string;
  priority: 'CRITICAL' | 'HIGH';
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
  assignedTeam: string;
  inspectorName: string;
  reportedAt: string;
  correctiveActionPlan?: string;
}

/**
 * 점검 공차 이탈(FAIL) 시 CAPA(시정조치 및 예방조치) 긴급 정비 티켓 자동 생성 (순수 함수)
 */
export function generateCapaTicketFromInspectionFail(
  failedParam: ToleranceCheckParams,
  inspectorName: string,
  options: { assignedTeam?: string; reportedAt?: string } = {}
): CapaTicketDraft {
  const checkRes = evaluateToleranceResult(failedParam);
  const reportedAt = options.reportedAt || new Date(Date.now()).toISOString();
  const dateStr = reportedAt.slice(2, 10).replace(/-/g, '');
  const ticketNumber = `CAPA-${dateStr}-${Math.floor(100 + Math.random() * 900)}`;

  const isSevere =
    (failedParam.minAllowed !== undefined &&
      failedParam.numericValue < failedParam.minAllowed - 3) ||
    (failedParam.maxAllowed !== undefined &&
      failedParam.numericValue > failedParam.maxAllowed + 3);

  return {
    ticketNumber,
    checklistItemId: failedParam.itemId,
    checklistItemTitle: failedParam.itemTitle,
    failureReason: checkRes.message,
    priority: isSevere ? 'CRITICAL' : 'HIGH',
    status: 'OPEN',
    assignedTeam: options.assignedTeam || '시설안전/유지보수팀',
    inspectorName,
    reportedAt,
    correctiveActionPlan: `1차 조치: 현장 설비 즉시 격리 및 가동 중단 후 엔지니어 긴급 점검 요망 (${failedParam.itemTitle})`,
  };
}

export interface HaccpDailyLogRecord {
  checkDate: string; // YYYY-MM-DD
  managerSignature: string;
  directorApproval: boolean;
  items: {
    itemTitle: string;
    targetValue: string;
    actualValue: string;
    isPassed: boolean;
    note?: string;
  }[];
}
