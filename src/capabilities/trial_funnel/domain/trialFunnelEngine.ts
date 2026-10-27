/**
 * 무료 체험 및 신규 상담 리드 파이프라인 엔진 (Pure Domain Function)
 * 5단계 퍼널 상태 머신 및 단계별 전환율 분석
 */

export type TrialLeadStatus =
  | 'new_inquiry'
  | 'consult_scheduled'
  | 'trial_attended'
  | 'converted'
  | 'dropped';

export type LeadSource =
  | 'instagram'
  | 'naver'
  | 'referral'
  | 'walk_in'
  | 'flyer'
  | 'other';

export interface TrialLead {
  id: string;
  organization_id: string;
  customer_name: string;
  phone: string;
  source: LeadSource;
  status: TrialLeadStatus;
  target_program?: string | null;
  trial_date?: string | null; // YYYY-MM-DD
  assigned_staff_id?: string | null;
  notes?: string | null;
  drop_reason?: string | null;
  converted_pass_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransitionPayload {
  drop_reason?: string;
  converted_pass_id?: string;
  trial_date?: string;
}

export interface TransitionValidationResult {
  allowed: boolean;
  error?: string;
}

/**
 * 상태 전이 규칙 검증
 * - new_inquiry -> consult_scheduled, dropped
 * - consult_scheduled -> trial_attended, dropped
 * - trial_attended -> converted, dropped
 * - converted / dropped (종료 상태, 단 재문의 시 new_inquiry로 재개 가능)
 */
export function validateLeadStatusTransition(
  currentStatus: TrialLeadStatus,
  nextStatus: TrialLeadStatus,
  payload?: TransitionPayload
): TransitionValidationResult {
  if (currentStatus === nextStatus) {
    return { allowed: true };
  }

  // 1. 드롭(이탈) 시 사유 필수 검증
  if (nextStatus === 'dropped') {
    if (!payload?.drop_reason || payload.drop_reason.trim() === '') {
      return {
        allowed: false,
        error: '이탈(등록 포기) 처리 시 이탈 사유 입력이 필수입니다.',
      };
    }
    return { allowed: true };
  }

  // 2. 정규 전환(converted) 시 등록 이용권 ID 필수 검증
  if (nextStatus === 'converted') {
    if (currentStatus !== 'trial_attended' && currentStatus !== 'consult_scheduled') {
      return {
        allowed: false,
        error: '상담 완료 또는 체험 참석 상태에서만 정규 등록으로 전환할 수 있습니다.',
      };
    }
    if (!payload?.converted_pass_id) {
      return {
        allowed: false,
        error: '정규 회원 전환 시 등록된 수강권/이용권 정보가 필요합니다.',
      };
    }
    return { allowed: true };
  }

  // 3. 체험 일정 확정 시 날짜 검증
  if (nextStatus === 'trial_attended' || nextStatus === 'consult_scheduled') {
    if (payload?.trial_date && isNaN(Date.parse(payload.trial_date))) {
      return {
        allowed: false,
        error: '유효하지 않은 날짜 형식입니다.',
      };
    }
    return { allowed: true };
  }

  // 4. 종료 상태에서 재문의로의 재개
  if ((currentStatus === 'dropped' || currentStatus === 'converted') && nextStatus === 'new_inquiry') {
    return { allowed: true };
  }

  return { allowed: true };
}

export interface FunnelMetrics {
  totalLeads: number;
  newInquiries: number;
  consultScheduled: number;
  trialAttended: number;
  converted: number;
  dropped: number;
  overallConversionRate: number; // 전체 리드 대비 등록 전환율 (%)
  trialToConvertRate: number; // 체험 참석자 대비 등록 전환율 (%)
}

/**
 * 퍼널 전환 지표 통계 계산
 */
export function calculateFunnelMetrics(leads: TrialLead[]): FunnelMetrics {
  const total = leads.length;
  if (total === 0) {
    return {
      totalLeads: 0,
      newInquiries: 0,
      consultScheduled: 0,
      trialAttended: 0,
      converted: 0,
      dropped: 0,
      overallConversionRate: 0,
      trialToConvertRate: 0,
    };
  }

  const counts: Record<TrialLeadStatus, number> = {
    new_inquiry: 0,
    consult_scheduled: 0,
    trial_attended: 0,
    converted: 0,
    dropped: 0,
  };

  leads.forEach((l) => {
    if (counts[l.status] !== undefined) {
      counts[l.status] += 1;
    }
  });

  const overallConversionRate = Math.round((counts.converted / total) * 1000) / 10;
  const trialOrConverted = counts.trial_attended + counts.converted;
  const trialToConvertRate =
    trialOrConverted > 0
      ? Math.round((counts.converted / trialOrConverted) * 1000) / 10
      : 0;

  return {
    totalLeads: total,
    newInquiries: counts.new_inquiry,
    consultScheduled: counts.consult_scheduled,
    trialAttended: counts.trial_attended,
    converted: counts.converted,
    dropped: counts.dropped,
    overallConversionRate,
    trialToConvertRate,
  };
}

/**
 * 칸반 보드용 상태별 리드 그룹화
 */
export function groupLeadsByStatus(leads: TrialLead[]): Record<TrialLeadStatus, TrialLead[]> {
  const grouped: Record<TrialLeadStatus, TrialLead[]> = {
    new_inquiry: [],
    consult_scheduled: [],
    trial_attended: [],
    converted: [],
    dropped: [],
  };

  leads.forEach((l) => {
    if (grouped[l.status]) {
      grouped[l.status].push(l);
    }
  });

  return grouped;
}

/**
 * 리드 데이터를 기반으로 상담 CRM(consultations) 레코드 페이로드 생성
 */
export function buildConsultationFromLead(
  lead: TrialLead,
  options?: {
    consultationDate?: string;
    staffId?: string | null;
    customerId?: string;
  }
) {
  const consultDate = options?.consultationDate || lead.trial_date || new Date().toISOString().slice(0, 10);
  return {
    customer_id: options?.customerId || lead.id,
    staff_id: options?.staffId || lead.assigned_staff_id || null,
    consultation_date: consultDate,
    type: 'trial_inquiry',
    content: `[체험/상담 리드 연계] 고객: ${lead.customer_name} (${lead.phone}) / 유입: ${lead.source} / 희망: ${lead.target_program || '일반'} / 메모: ${lead.notes || '없음'}`,
    result: 'pending',
    follow_up: '체험 수업 진행 및 등록 상담',
  };
}

/**
 * 리드 데이터를 기반으로 고객(customers) 등록 페이로드 생성
 */
export function buildCustomerFromLead(lead: TrialLead) {
  return {
    name: lead.customer_name,
    phone: lead.phone,
    status: 'active',
    memo: `[리드 파이프라인 전환] 유입경로: ${lead.source}, 수강희망: ${lead.target_program || '미정'}`,
    metadata: {
      lead_id: lead.id,
      source: lead.source,
      converted_at: new Date().toISOString(),
    },
  };
}

/**
 * 리드가 정규 회원으로 전환(converted) 가능한 상태인지 검사하는 순수 함수
 * - 상담 완료/예약(CONSULTED, consult_scheduled) 또는 체험 참석(VISITED, trial_attended) 상태일 때 전환 가능
 * - 이미 전환 완료(CONVERTED, converted) 또는 이탈(LOST, dropped), 미상담 단순 접수(APPLIED, new_inquiry) 상태는 전환 불가
 */
export function canConvertLead(status: string): boolean {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === 'trial_attended' ||
    s === 'consult_scheduled' ||
    s === 'visited' ||
    s === 'consulted'
  );
}
