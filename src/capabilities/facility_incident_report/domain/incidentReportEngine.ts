/**
 * facility_incident_report 도메인 비즈니스 엔진
 * 안전사고·기물파손 경위서 & 배상책임보험 청구 대장
 */

export type IncidentType =
  | 'injury'
  | 'property_damage'
  | 'conflict'
  | 'pet_incident'
  | 'equipment_failure'
  | 'near_miss' // ISO 45001 아차사고 (Near-miss)
  | 'environmental_spill' // ISO 14001 환경오염 및 화학물질 유출 사고
  | 'other';
export type IncidentSeverity = 'minor' | 'moderate' | 'severe' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'insurance_processing' | 'resolved';

export interface LegalReportingRequirement {
  requiresGovernmentReport: boolean;
  reportingDeadlineHours: number; // 법정 신고 기한 (시간)
  targetAuthority: string; // 관할 관공서 (예: 고용노동부, 환경부/지자체 환경과)
  isNearMiss: boolean;
  internalInvestigationDeadlineHours: number; // 사내 조사 기한 (시간)
}

export interface IncidentReportItem {
  id: string;
  organizationId: string;
  incidentTitle: string;
  incidentDate: string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  locationInFacility: string;
  involvedPersonName: string;
  involvedPersonRole: string;
  witnessName?: string | null;
  supervisorName?: string | null;
  description: string;
  injuryDetails?: string | null;
  emergencyActionTaken?: string | null;
  guardianNotifiedAt?: string | null;
  hospitalTransported: boolean;
  insuranceClaimed: boolean;
  insuranceClaimNumber?: string | null;
  preventativeAction?: string | null;
  legalReporting?: LegalReportingRequirement;
  status: IncidentStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTimelineItem {
  id: string;
  incidentId: string;
  recordedAt: string;
  actionType: string;
  actorName: string;
  note: string;
}

/**
 * 부상 정도 및 병원 이송 여부에 따른 사고 심각도 자동 판정
 */
export function evaluateIncidentSeverity(input: {
  hospitalTransported: boolean;
  hasFractureOrBleeding?: boolean;
  propertyDamageAmount?: number;
}): IncidentSeverity {
  if (input.hospitalTransported) {
    return 'severe';
  }
  if (input.hasFractureOrBleeding) {
    return 'moderate';
  }
  if (input.propertyDamageAmount && input.propertyDamageAmount >= 1000000) {
    return 'severe';
  }
  if (input.propertyDamageAmount && input.propertyDamageAmount >= 300000) {
    return 'moderate';
  }
  return 'minor';
}

/**
 * ISO 45001 / ISO 14001: 아차사고(Near-miss) 및 환경사고 법정 보고/조사 기한 판정
 */
export function evaluateLegalReportingRequirement(
  incidentType: IncidentType,
  severity: IncidentSeverity
): LegalReportingRequirement {
  if (incidentType === 'near_miss') {
    return {
      requiresGovernmentReport: false,
      reportingDeadlineHours: 0,
      targetAuthority: '사내 안전보건위원회',
      isNearMiss: true,
      internalInvestigationDeadlineHours: 48, // 아차사고는 48시간 이내 원인조사 완료
    };
  }

  if (incidentType === 'environmental_spill') {
    const isMajor = severity === 'severe' || severity === 'critical';
    return {
      requiresGovernmentReport: isMajor,
      reportingDeadlineHours: isMajor ? 24 : 72, // 중대 환경사고 24시간 이내 관할청 신고
      targetAuthority: '지자체 환경보전과 / 유역환경청',
      isNearMiss: false,
      internalInvestigationDeadlineHours: 24,
    };
  }

  if (severity === 'critical') {
    return {
      requiresGovernmentReport: true,
      reportingDeadlineHours: 24, // 중대재해 발생 시 24시간 이내 관할 고용노동지청 보고
      targetAuthority: '관할 고용노동지청',
      isNearMiss: false,
      internalInvestigationDeadlineHours: 12,
    };
  }

  return {
    requiresGovernmentReport: false,
    reportingDeadlineHours: 0,
    targetAuthority: '사내 안전관리팀',
    isNearMiss: false,
    internalInvestigationDeadlineHours: 72,
  };
}

/**
 * 사고 상태 전이 검증
 */
export function transitionIncidentStatus(
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus,
  options?: { insuranceClaimNumber?: string; preventativeAction?: string }
): { valid: boolean; reason?: string } {
  const allowedTransitions: Record<IncidentStatus, IncidentStatus[]> = {
    open: ['investigating', 'resolved'],
    investigating: ['insurance_processing', 'resolved', 'open'],
    insurance_processing: ['resolved', 'investigating'],
    resolved: ['open', 'investigating'],
  };

  if (!allowedTransitions[currentStatus]?.includes(targetStatus)) {
    return {
      valid: false,
      reason: `현재 '${currentStatus}' 상태에서는 '${targetStatus}'(으)로 직접 전이할 수 없습니다.`,
    };
  }

  if (targetStatus === 'insurance_processing' && !options?.insuranceClaimNumber) {
    return {
      valid: false,
      reason: '보험 처리 상태로 변경하려면 보험 접수 번호가 필요합니다.',
    };
  }

  if (targetStatus === 'resolved' && !options?.preventativeAction) {
    return {
      valid: false,
      reason: '사고 종결 처리 시 재발 방지 대책이 필수로 기록되어야 합니다.',
    };
  }

  return { valid: true };
}

/**
 * 0원 W3C SVG 표준 사고경위서/확인증 그래픽 생성
 */
export function renderIncidentReportSvg(report: IncidentReportItem): string {
  const safeTitle = (report.incidentTitle || '시설 안전사고 경위서')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safePerson = (report.involvedPersonName || '미상')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeLocation = (report.locationInFacility || '원내')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeDate = report.incidentDate.slice(0, 10);
  const severityColor =
    report.severity === 'critical'
      ? '#dc2626'
      : report.severity === 'severe'
      ? '#ea580c'
      : report.severity === 'moderate'
      ? '#d97706'
      : '#2563eb';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 280" width="100%" height="100%">
  <rect width="500" height="280" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
  <rect x="0" y="0" width="500" height="50" rx="16" fill="#1e293b"/>
  <rect x="0" y="30" width="500" height="20" fill="#1e293b"/>
  <text x="24" y="32" fill="#ffffff" font-size="16" font-weight="bold" font-family="sans-serif">🚨 시설 안전사고 및 파손 경위서</text>
  <rect x="400" y="14" width="76" height="24" rx="12" fill="${severityColor}"/>
  <text x="438" y="30" fill="#ffffff" font-size="11" font-weight="bold" text-anchor="middle" font-family="sans-serif">${report.severity.toUpperCase()}</text>
  
  <text x="24" y="85" fill="#64748b" font-size="12" font-family="sans-serif">사고명</text>
  <text x="24" y="105" fill="#0f172a" font-size="15" font-weight="bold" font-family="sans-serif">${safeTitle}</text>
  
  <text x="24" y="145" fill="#64748b" font-size="12" font-family="sans-serif">발생일시</text>
  <text x="24" y="165" fill="#334155" font-size="13" font-family="sans-serif">${safeDate}</text>
  
  <text x="180" y="145" fill="#64748b" font-size="12" font-family="sans-serif">발생장소</text>
  <text x="180" y="165" fill="#334155" font-size="13" font-family="sans-serif">${safeLocation}</text>

  <text x="330" y="145" fill="#64748b" font-size="12" font-family="sans-serif">당사자</text>
  <text x="330" y="165" fill="#334155" font-size="13" font-weight="bold" font-family="sans-serif">${safePerson} (${report.involvedPersonRole})</text>
  
  <line x1="24" y1="190" x2="476" y2="190" stroke="#f1f5f9" stroke-width="1.5"/>
  
  <text x="24" y="220" fill="#64748b" font-size="12" font-family="sans-serif">상태: <tspan fill="#0284c7" font-weight="bold">${report.status.toUpperCase()}</tspan></text>
  <text x="180" y="220" fill="#64748b" font-size="12" font-family="sans-serif">병원후송: ${report.hospitalTransported ? '🚑 완료' : '없음'}</text>
  <text x="330" y="220" fill="#64748b" font-size="12" font-family="sans-serif">보험청구: ${report.insuranceClaimed ? '📄 ' + (report.insuranceClaimNumber || '접수됨') : '미청구'}</text>

  <text x="250" y="260" fill="#94a3b8" font-size="11" text-anchor="middle" font-family="sans-serif">Moa Safety Trust System • 전자 사고 기록부</text>
</svg>`;
}

/**
 * 0원 보호자 유선 안내 및 알림톡/SMS 텍스트 템플릿
 */
export function formatIncidentNotificationText(report: IncidentReportItem): string {
  const hospitalText = report.hospitalTransported ? '병원 후송 및 진료가 진행되었습니다.' : '원내/시설 내에서 즉시 응급처치를 완료하였습니다.';
  return `[시설 안전사고 경위 및 안내]
안녕하세요. 시설 내에서 발생한 상황을 신속하고 투명하게 안내드립니다.

- 일시: ${report.incidentDate.slice(0, 16).replace('T', ' ')}
- 장소: ${report.locationInFacility}
- 대상: ${report.involvedPersonName} (${report.involvedPersonRole})
- 상황: ${report.incidentTitle}
- 세부내용: ${report.description}
- 현장조치: ${report.emergencyActionTaken || hospitalText}

고객/회원의 빠른 안정과 회복을 최우선으로 돌보고 있으며, 추가 문의사항은 언제든 운영본부/센터로 연락 주시기 바랍니다.`;
}

/**
 * ISO 9001 / 14001 / 45001 10.2항: 시정 및 예방 조치 (CAPA) 폐쇄 루프 상태
 */
export type CapaStage =
  | 'reported' // 1. 부적합/사고 접수
  | 'root_cause' // 2. 근본 원인 분석 (5-Why, 4M, 특성요인도)
  | 'action_plan' // 3. 시정 및 재발방지 대책 수립
  | 'implementation' // 4. 대책 실행 중
  | 'verification' // 5. 유효성 검증 (재발 여부 확인)
  | 'closed'; // 6. 유효성 입증 및 최종 종결

export interface CapaActionPlanItem {
  id: string;
  actionTitle: string;
  assigneeName: string;
  dueDate: string;
  completedAt?: string;
  actionType: 'immediate_correction' | 'preventative_systemic';
}

export interface CapaRootCauseAnalysis {
  method: '5_why' | '4m' | 'fishbone';
  whys?: string[]; // 5-Why 단계별 답변
  directCause: string; // 직접 원인
  rootCause: string; // 근본 원인
  contributingFactors?: string[]; // 기여 요인
}

export interface CapaEffectivenessVerification {
  verifiedAt: string;
  verifierName: string;
  isEffective: boolean; // 효과성 입증 여부
  recurrenceObserved: boolean; // 재발 관찰 여부
  evidenceDescription: string; // 증빙 설명
}

export interface CapaRecord {
  id: string;
  organizationId: string;
  sourceType: 'incident' | 'quality_defect' | 'audit_finding' | 'customer_complaint' | 'near_miss';
  sourceId: string;
  title: string;
  currentStage: CapaStage;
  rootCause?: CapaRootCauseAnalysis;
  actions: CapaActionPlanItem[];
  verification?: CapaEffectivenessVerification;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

/**
 * ISO 10.2 폐쇄 루프 CAPA 단계 전이 검증 엔진
 */
export function transitionCapaStage(
  currentStage: CapaStage,
  targetStage: CapaStage,
  payload?: {
    rootCause?: CapaRootCauseAnalysis;
    actions?: CapaActionPlanItem[];
    verification?: CapaEffectivenessVerification;
  }
): { valid: boolean; reason?: string } {
  const allowedTransitions: Record<CapaStage, CapaStage[]> = {
    reported: ['root_cause'],
    root_cause: ['action_plan', 'reported'],
    action_plan: ['implementation', 'root_cause'],
    implementation: ['verification', 'action_plan'],
    verification: ['closed', 'root_cause', 'action_plan'],
    closed: ['verification'],
  };

  if (!allowedTransitions[currentStage]?.includes(targetStage)) {
    return {
      valid: false,
      reason: `CAPA 단계 '${currentStage}'에서는 '${targetStage}'(으)로 직접 전이할 수 없습니다.`,
    };
  }

  // 1. root_cause -> action_plan: 근본원인이 명시되어야 함
  if (targetStage === 'action_plan' && currentStage === 'root_cause') {
    if (!payload?.rootCause?.rootCause?.trim()) {
      return {
        valid: false,
        reason: '대책 수립 단계로 진행하려면 근본 원인(Root Cause) 분석이 필수입니다.',
      };
    }
  }

  // 2. action_plan -> implementation: 1개 이상의 시정 조치 계획이 수립되어야 함
  if (targetStage === 'implementation' && currentStage === 'action_plan') {
    if (!payload?.actions || payload.actions.length === 0) {
      return {
        valid: false,
        reason: '실행 단계로 진행하려면 1개 이상의 시정/예방 조치 계획이 수립되어야 합니다.',
      };
    }
  }

  // 3. implementation -> verification: 모든 시정 조치가 완료(completedAt 존재)되어야 함
  if (targetStage === 'verification' && currentStage === 'implementation') {
    const pendingActions = payload?.actions?.filter((a) => !a.completedAt) ?? [];
    if (pendingActions.length > 0) {
      return {
        valid: false,
        reason: `미완료된 시정 조치가 ${pendingActions.length}건 존재하여 유효성 검증으로 진행할 수 없습니다.`,
      };
    }
  }

  // 4. verification -> closed: 유효성이 입증(isEffective=true)되고 재발이 없어야(recurrenceObserved=false) 종결 가능
  if (targetStage === 'closed' && currentStage === 'verification') {
    if (!payload?.verification) {
      return {
        valid: false,
        reason: '최종 종결을 위해서는 유효성 평가 결과가 등록되어야 합니다.',
      };
    }
    if (!payload.verification.isEffective || payload.verification.recurrenceObserved) {
      return {
        valid: false,
        reason: '시정 조치의 유효성이 입증되지 않았거나 동일 결함이 재발하여 종결할 수 없습니다. (원인 재분석 필요)',
      };
    }
  }

  return { valid: true };
}
