export type FourMCategory = 'man' | 'machine' | 'material' | 'method' | 'spec';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ChangeOrderStatus = 'draft' | 'reviewing' | 'approved' | 'applied' | 'rejected' | 'cancelled';
export type EvaluatorRole = 'quality' | 'production' | 'safety' | 'procurement' | 'engineering';

export interface ChangeOrderEvaluation {
  id?: string;
  evaluator_role: EvaluatorRole;
  evaluator_name: string;
  impact_assessment: string;
  is_approved: boolean;
  risk_notes?: string | null;
}

export interface ChangeOrderReadinessResult {
  canApprove: boolean;
  canApply: boolean;
  missingRoles: EvaluatorRole[];
  rejectionReasons: string[];
  requiresExecutiveApproval: boolean;
}

/**
 * 4M 변경 통지서(ECN)의 적용 및 승인 준비도 판정 엔진
 * 
 * 불변식:
 * 1. 품질(Quality) 부서 평가는 필수이다.
 * 2. 부서 평가 중 단 하나라도 is_approved=false이면 자동 승인 불가(rejection).
 * 3. 고위험(high, critical)인 경우 품질 + 안전/생산 등 최소 2개 부서 합의 필요.
 * 4. applied 상태 전이는 오직 approved 상태에서만 가능하다.
 */
export function evaluateChangeOrderReadiness(
  status: ChangeOrderStatus,
  riskLevel: RiskLevel,
  evaluations: readonly ChangeOrderEvaluation[],
  options?: { requireSafetyForCritical?: boolean }
): ChangeOrderReadinessResult {
  const missingRoles: EvaluatorRole[] = [];
  const rejectionReasons: string[] = [];

  const rolesPresent = new Set(evaluations.map((e) => e.evaluator_role));

  // 1. 품질 부서 사전 검토는 상시 필수
  if (!rolesPresent.has('quality')) {
    missingRoles.push('quality');
  }

  // 2. Critical 등급인 경우 안전(safety) 부서 평가 필수
  if ((riskLevel === 'critical' || options?.requireSafetyForCritical) && !rolesPresent.has('safety')) {
    missingRoles.push('safety');
  }

  // 3. 반려 의견 수집
  for (const ev of evaluations) {
    if (!ev.is_approved) {
      rejectionReasons.push(`[${ev.evaluator_role}] ${ev.evaluator_name}: ${ev.impact_assessment}`);
    }
  }

  const requiresExecutiveApproval = riskLevel === 'high' || riskLevel === 'critical';
  const hasMinEvaluations = riskLevel === 'critical' ? evaluations.length >= 2 : evaluations.length >= 1;

  const canApprove =
    missingRoles.length === 0 &&
    rejectionReasons.length === 0 &&
    hasMinEvaluations &&
    (status === 'draft' || status === 'reviewing');

  const canApply = status === 'approved' && rejectionReasons.length === 0;

  return {
    canApprove,
    canApply,
    missingRoles,
    rejectionReasons,
    requiresExecutiveApproval,
  };
}

/**
 * ECN 변경 통지서 고유 번호 채번 포맷터
 */
export function formatChangeNumber(prefix: string, date: Date, sequence: number): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  const safePrefix = (prefix || 'ECN').toUpperCase().trim();
  return `${safePrefix}-${year}${month}-${seq}`;
}

/**
 * 4M 영향 요소 기반 추천 위험 등급 산출
 */
export function assessChangeRiskLevel(params: {
  category: FourMCategory;
  affectsSafety: boolean;
  affectsCustomerSpec: boolean;
  estimatedDowntimeHours?: number;
}): RiskLevel {
  if (params.affectsSafety) {
    return 'critical';
  }
  if (params.affectsCustomerSpec || (params.estimatedDowntimeHours && params.estimatedDowntimeHours >= 8)) {
    return 'high';
  }
  if (params.category === 'material' || params.category === 'method') {
    return 'medium';
  }
  return 'low';
}
