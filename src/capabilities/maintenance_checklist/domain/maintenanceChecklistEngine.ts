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
