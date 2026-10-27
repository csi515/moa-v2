/**
 * 매장 내규·사규(Workplace Policy) 순수 도메인 엔진 (Pure Functions)
 *
 * 비용 0원 원칙:
 *  - 외부 법률 API 또는 외부 전자계약 유료 서비스 배제
 *  - W3C/HTML5 캔버스 기반 모바일 터치 서명 SVG/DataURL 불변 감사 로그
 *  - 사규 버전 개정 시 기존 서약 이력 보존 및 신규 버전 재서약 감지
 */

export type PolicyCategory =
  | 'service_code' // 서비스 복무 수칙 (고객 응대, 복장)
  | 'safety_rule' // 매장 안전·위생 규정 (화재, 비상 대피, 소독)
  | 'dormitory_rule' // 숙소/휴게실 이용 내규
  | 'compensation' // 인센티브·수당·환불 규정
  | 'employment_terms' // [인사/노무] 취업규칙 및 근로계약 기본 조건
  | 'nda_confidentiality' // [보안/준법] 비밀유지서약서(NDA) 및 정보보호 서약
  | 'general'; // 일반 사업장 공통 내규

export interface WorkplacePolicy {
  id: string;
  organizationId: string;
  title: string;
  category: PolicyCategory;
  content: string;
  version: number;
  isMandatory: boolean;
  effectiveDate: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface PolicyAcknowledgement {
  id: string;
  organizationId: string;
  policyId: string;
  policyVersion: number;
  staffId: string;
  acknowledgedAt: string; // ISO 8601
  signatureDataUrl: string; // SVG or image/png Data URL
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface PendingPolicyCheckResult {
  hasPendingMandatory: boolean;
  pendingPolicies: WorkplacePolicy[];
  acknowledgedCount: number;
  totalMandatoryCount: number;
}

export interface ComplianceRateResult {
  totalRequired: number;
  completedCount: number;
  complianceRatePercent: number;
  nonCompliantStaffIds: string[];
}

/**
 * 특정 사규의 최신 버전에 대해 직원이 서약했는지 확인 (순수 함수)
 */
export function isPolicyAcknowledged(
  staffId: string,
  policy: WorkplacePolicy,
  acknowledgements: readonly PolicyAcknowledgement[]
): boolean {
  return acknowledgements.some(
    (ack) =>
      ack.staffId === staffId &&
      ack.policyId === policy.id &&
      ack.policyVersion === policy.version
  );
}

/**
 * 특정 직원의 미확인 필수 사규 목록 감지 (순수 함수)
 * - 신규 입사자: 모든 필수 사규 미서약 감지
 * - 기존 직원: 사규 개정(version 증가) 시 신규 버전에 대한 미서약 감지
 */
export function checkPendingMandatoryPolicies(
  staffId: string,
  policies: readonly WorkplacePolicy[],
  acknowledgements: readonly PolicyAcknowledgement[]
): PendingPolicyCheckResult {
  const mandatoryPolicies = policies.filter((p) => p.isMandatory);
  const pendingPolicies: WorkplacePolicy[] = [];

  let acknowledgedCount = 0;

  for (const policy of mandatoryPolicies) {
    if (isPolicyAcknowledged(staffId, policy, acknowledgements)) {
      acknowledgedCount++;
    } else {
      pendingPolicies.push(policy);
    }
  }

  return {
    hasPendingMandatory: pendingPolicies.length > 0,
    pendingPolicies,
    acknowledgedCount,
    totalMandatoryCount: mandatoryPolicies.length,
  };
}

/**
 * 전 매장 사규 준수율 및 미이행 직원 집계 (순수 함수)
 */
export function calculatePolicyComplianceRate(
  staffIds: readonly string[],
  policies: readonly WorkplacePolicy[],
  acknowledgements: readonly PolicyAcknowledgement[]
): ComplianceRateResult {
  const mandatoryPolicies = policies.filter((p) => p.isMandatory);
  const totalRequired = staffIds.length * mandatoryPolicies.length;

  if (totalRequired === 0) {
    return {
      totalRequired: 0,
      completedCount: 0,
      complianceRatePercent: 100,
      nonCompliantStaffIds: [],
    };
  }

  let completedCount = 0;
  const nonCompliantStaffIds: string[] = [];

  for (const staffId of staffIds) {
    let staffAllCompliant = true;
    for (const policy of mandatoryPolicies) {
      if (isPolicyAcknowledged(staffId, policy, acknowledgements)) {
        completedCount++;
      } else {
        staffAllCompliant = false;
      }
    }
    if (!staffAllCompliant) {
      nonCompliantStaffIds.push(staffId);
    }
  }

  const complianceRatePercent = Math.round((completedCount / totalRequired) * 100);

  return {
    totalRequired,
    completedCount,
    complianceRatePercent,
    nonCompliantStaffIds,
  };
}

/**
 * 사규 개정 시 다음 버전 계산
 */
export function getNextPolicyVersion(currentVersion: number): number {
  return Math.max(1, Math.floor(currentVersion) + 1);
}

export interface NonCompliantStaffAlert {
  staffId: string;
  missingPolicyIds: string[];
  missingPolicyTitles: string[];
  urgency: 'high' | 'normal';
}

/**
 * 취업규칙 및 근로계약/NDA 미서약 직원 독촉 알림 목록 산출 (순수 함수)
 * - employment_terms 또는 nda_confidentiality 누락 시 urgency: 'high' 부여
 */
export function identifyNonCompliantStaffAlerts(
  mandatoryPolicies: readonly WorkplacePolicy[],
  acknowledgements: readonly PolicyAcknowledgement[],
  allStaffIds: readonly string[]
): NonCompliantStaffAlert[] {
  const alerts: NonCompliantStaffAlert[] = [];

  for (const staffId of allStaffIds) {
    const missingPolicies = mandatoryPolicies.filter(
      (p) => !isPolicyAcknowledged(staffId, p, acknowledgements)
    );

    if (missingPolicies.length > 0) {
      const hasHighPriority = missingPolicies.some(
        (p) => p.category === 'nda_confidentiality' || p.category === 'employment_terms'
      );
      alerts.push({
        staffId,
        missingPolicyIds: missingPolicies.map((p) => p.id),
        missingPolicyTitles: missingPolicies.map((p) => p.title),
        urgency: hasHighPriority ? 'high' : 'normal',
      });
    }
  }

  return alerts;
}

