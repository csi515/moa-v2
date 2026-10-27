/**
 * 현장 전자계약 & 환불 규정 서명 보관 도메인 엔진 (Pure Functions)
 *
 * 적용 업종: 1:1 PT샵(pt_fitness), 헬스장(gym_fitness), 학원 8종, 미용실, 스파
 *
 * 주요 기능:
 *  1. 표준이용계약서(PT, 회원권, 수강료) 및 표준근로계약서 조항 관리
 *  2. 공정거래위원회 표준약관 기반 중도 해지 위약금(10%) 및 일할/회차 차감 환불금 자동 산출
 *  3. 계약 기간 만료 D-Day 계산 및 계약 상태머신 (ACTIVE -> EXPIRED / TERMINATED / REFUNDED)
 */

export type ContractTemplateType =
  | 'personal_training' // 1:1 PT 및 레슨 이용계약서
  | 'membership_pass' // 피트니스/시설 정기 회원권 계약서
  | 'academy_tuition' // 학원 수강 등록 및 교습비 계약서
  | 'staff_employment' // 파트타임 강사/직원 표준근로계약서
  | 'instructor_consignment'; // 문화센터 강사 강의 위탁 및 매출배분 계약서

import { createStateMachine } from '@/core/fsm/finiteStateMachine';

export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_SIGN'
  | 'SIGNED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'TERMINATED'
  | 'REFUNDED';

export const digitalContractFSM = createStateMachine<ContractStatus, string>({
  domain: 'digital_contract',
  initialState: 'DRAFT',
  finalStates: ['EXPIRED', 'TERMINATED', 'REFUNDED'],
  transitions: [
    { from: 'DRAFT', to: 'PENDING_SIGN', event: 'REQUEST_SIGNATURE' },
    { from: 'PENDING_SIGN', to: 'SIGNED', event: 'SIGN' },
    { from: 'SIGNED', to: 'ACTIVE', event: 'ACTIVATE' },
    { from: 'ACTIVE', to: 'EXPIRED', event: 'EXPIRE' },
    { from: 'ACTIVE', to: 'TERMINATED', event: 'TERMINATE' },
    { from: 'ACTIVE', to: 'REFUNDED', event: 'REFUND' },
    { from: 'SIGNED', to: 'TERMINATED', event: 'TERMINATE' },
    { from: 'SIGNED', to: 'REFUNDED', event: 'REFUND' },
  ],
});

export interface LegalProofMetadata {
  signatureCanvasDataUrl?: string; // 자필 전자서명 이미지 (Data URL)
  signedAt: string; // 서명 완료 타임스탬프 (ISO)
  clientIp?: string; // 접속 IP (e.g. "125.132.88.12")
  userAgent?: string; // 브라우저 User-Agent
  deviceHash?: string; // 식별 해시값
  certificateHash?: string; // 전자문서 위변조 방지 해시값
}

export interface ContractClause {
  id: string;
  title: string;
  content: string;
  mandatory: boolean;
}

export interface SignedContract {
  id: string;
  contractNumber: string; // e.g. "CTR-202610-001"
  templateType: ContractTemplateType;
  title: string;
  customerName: string;
  customerPhone: string;
  totalContractAmount: number; // 총 계약금액
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalSessionsOrDays: number; // 총 등록 회차 또는 총 일수
  usedSessionsOrDays: number; // 현재 소진된 회차 또는 이용 일수
  signatureDataUrl?: string; // 자필 전자서명 이미지
  signedAt: string; // ISO String
  status: ContractStatus;
  legalProof?: LegalProofMetadata;
  notes?: string;
}

export interface RefundCalculationResult {
  contractNumber: string;
  totalAmount: number;
  usedAmount: number; // 이용 대가 (단가 * 소진 회차/일수)
  penaltyAmount: number; // 위약금 (총액의 10%)
  refundableAmount: number; // 최종 환불 예상액 = 총액 - 이용대가 - 위약금
  deductionSummary: string;
}

export interface ContractSummaryMetrics {
  totalContractCount: number;
  activeCount: number;
  expiredCount: number;
  refundedCount: number;
  totalContractValue: number;
}

/**
 * 1. 공정위 표준약관 기준 중도 해지 환불금 산출 (순수 함수)
 *    환불금 = 총 결제금액 - 이용 대가(일할 또는 1회 정상단가 차감) - 위약금(총 결제금액의 10%)
 */
export function calculateRefundEstimate(
  contract: SignedContract,
  usedUnits: number,
  penaltyRatePercent = 10
): RefundCalculationResult {
  const safeUsed = Math.min(contract.totalSessionsOrDays, Math.max(0, usedUnits));
  const unitPrice =
    contract.totalSessionsOrDays > 0
      ? contract.totalContractAmount / contract.totalSessionsOrDays
      : 0;

  const usedAmount = Math.round(safeUsed * unitPrice);
  const penaltyAmount = Math.round((contract.totalContractAmount * penaltyRatePercent) / 100);
  const refundableAmount = Math.max(0, contract.totalContractAmount - usedAmount - penaltyAmount);

  return {
    contractNumber: contract.contractNumber,
    totalAmount: contract.totalContractAmount,
    usedAmount,
    penaltyAmount,
    refundableAmount,
    deductionSummary: `이용대가 ${usedAmount.toLocaleString()}원(${safeUsed}/${contract.totalSessionsOrDays}) + 위약금(${penaltyRatePercent}%) ${penaltyAmount.toLocaleString()}원 차감`,
  };
}

/**
 * 2. 계약 유효기간 기준 실시간 상태 평가 (순수 함수)
 */
export function evaluateContractStatus(
  contract: SignedContract,
  currentDate?: string
): ContractStatus {
  if (contract.status === 'TERMINATED' || contract.status === 'REFUNDED') {
    return contract.status;
  }

  const today = currentDate ? new Date(currentDate) : new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (todayStr > contract.endDate || contract.usedSessionsOrDays >= contract.totalSessionsOrDays) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}

/**
 * 3. 전체 계약서 아카이브 통계 요약 (순수 함수)
 */
export function summarizeContracts(
  contracts: readonly SignedContract[],
  currentDate?: string
): ContractSummaryMetrics {
  let activeCount = 0;
  let expiredCount = 0;
  let refundedCount = 0;
  let totalContractValue = 0;

  for (const c of contracts) {
    totalContractValue += c.totalContractAmount;
    const effStatus = evaluateContractStatus(c, currentDate);
    if (effStatus === 'ACTIVE') activeCount++;
    else if (effStatus === 'EXPIRED') expiredCount++;
    else if (effStatus === 'REFUNDED') refundedCount++;
  }

  return {
    totalContractCount: contracts.length,
    activeCount,
    expiredCount,
    refundedCount,
    totalContractValue,
  };
}

/**
 * 4. 문화센터 강사 위탁계약서 표준 조항 생성기
 */
export function generateInstructorConsignmentClauses(options: {
  centerSharePercent: number;
  instructorSharePercent: number;
  withholdingTax: boolean;
  materialCostDeduction?: boolean;
}): ContractClause[] {
  return [
    {
      id: 'clause-1',
      title: '제1조 (목적 및 강의 위탁)',
      content:
        '본 계약은 센터가 개설한 문화·교육 강좌의 강의 진행을 강사에게 위탁하고, 강사는 수강생에게 성실히 양질의 강의를 제공함을 목적으로 한다.',
      mandatory: true,
    },
    {
      id: 'clause-2',
      title: '제2조 (수강료 매출 배분 및 정산)',
      content: `강의 수강료 총 결제액 중 센터 ${options.centerSharePercent}%, 강사 ${options.instructorSharePercent}%의 비율(RS)로 매월 지정 정산일에 정산 지급한다.${
        options.materialCostDeduction ? ' (단, 실습 재료비는 실비 기준 우선 공제)' : ''
      }${options.withholdingTax ? ' 관련 세법에 의거하여 사업소득세 3.3%를 원천징수한 후 지정 계좌로 송금한다.' : ''}`,
      mandatory: true,
    },
    {
      id: 'clause-3',
      title: '제3조 (휴강 및 보강 의무)',
      content:
        '강사의 사정으로 인한 휴강은 최소 3일 전 센터 및 수강생에게 사전 공지하여야 하며, 정규 종강일 이전에 상호 협의된 일정으로 보강을 100% 완료하여야 한다.',
      mandatory: true,
    },
    {
      id: 'clause-4',
      title: '제4조 (계약의 해지)',
      content:
        '정당한 사유 없이 2회 이상 무단 휴강하거나, 수강생 대상 품위유지 위반 또는 교육 질서 문란 행위 발생 시 센터는 본 위탁계약을 즉시 해지할 수 있다.',
      mandatory: true,
    },
  ];
}

// ============================================================================
// 계약 상태 머신 전이 (DRAFT -> PENDING_SIGN -> SIGNED -> EXPIRED / TERMINATED)
// ============================================================================

export function canTransitionContractStatus(
  current: ContractStatus,
  next: ContractStatus
): { allowed: boolean; reason?: string } {
  if (current === next) return { allowed: true };

  const validTransitions: Record<ContractStatus, ContractStatus[]> = {
    DRAFT: ['PENDING_SIGN', 'TERMINATED'],
    PENDING_SIGN: ['SIGNED', 'DRAFT', 'TERMINATED'],
    SIGNED: ['ACTIVE', 'EXPIRED', 'TERMINATED', 'REFUNDED'],
    ACTIVE: ['EXPIRED', 'TERMINATED', 'REFUNDED'],
    EXPIRED: [],
    TERMINATED: [],
    REFUNDED: [],
  };

  const allowedNext = validTransitions[current] || [];
  if (allowedNext.includes(next)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `'${current}' 상태에서는 '${next}' 상태로 전이할 수 없습니다.`,
  };
}

// ============================================================================
// 공정거래위원회 표준 위약금 자동 산정 엔진
// ============================================================================

export interface KftcRefundParams {
  totalContractAmount: number;
  totalSessionsOrDays: number;
  usedSessionsOrDays: number;
  isServiceStarted: boolean; // 이용 개시 여부
  penaltyRatePercent?: number; // 기본 10%
}

export interface KftcRefundResult {
  totalAmount: number;
  isServiceStarted: boolean;
  usedAmount: number; // 이용 대가 (개시 전 0원)
  penaltyAmount: number; // 위약금 (개시 전 0원, 개시 후 총액의 10%)
  refundableAmount: number; // 최종 환불 예상액
  deductionExplanation: string;
}

/**
 * 공정위 표준약관 기반 중도 해지/환불금 산정 (순수 함수)
 * - 이용 개시 전: 100% 전액 환불 (위약금 면제)
 * - 이용 개시 후: 일할/회차 비례 이용대가 + 법정 위약금(10%) 공제
 */
export function calculateKftcStandardRefund(params: KftcRefundParams): KftcRefundResult {
  const {
    totalContractAmount,
    totalSessionsOrDays,
    usedSessionsOrDays,
    isServiceStarted,
    penaltyRatePercent = 10,
  } = params;

  if (totalContractAmount <= 0) {
    return {
      totalAmount: 0,
      isServiceStarted,
      usedAmount: 0,
      penaltyAmount: 0,
      refundableAmount: 0,
      deductionExplanation: '계약 금액이 0원입니다.',
    };
  }

  // 1. 이용 개시 전 해지: 총 결제금액 전액 환불
  if (!isServiceStarted || usedSessionsOrDays <= 0) {
    return {
      totalAmount: totalContractAmount,
      isServiceStarted: false,
      usedAmount: 0,
      penaltyAmount: 0,
      refundableAmount: totalContractAmount,
      deductionExplanation: '서비스 개시 전 취소로 공정위 규정에 의거 100% 전액 환불됩니다.',
    };
  }

  // 2. 이용 개시 후 해지: 이용대가 + 위약금 10% 공제
  const safeUsed = Math.min(totalSessionsOrDays, Math.max(0, usedSessionsOrDays));
  const unitPrice = totalSessionsOrDays > 0 ? totalContractAmount / totalSessionsOrDays : 0;
  const usedAmount = Math.round(safeUsed * unitPrice);
  const penaltyAmount = Math.round((totalContractAmount * penaltyRatePercent) / 100);

  const refundableAmount = Math.max(0, totalContractAmount - usedAmount - penaltyAmount);

  return {
    totalAmount: totalContractAmount,
    isServiceStarted: true,
    usedAmount,
    penaltyAmount,
    refundableAmount,
    deductionExplanation: `이용 대가(${safeUsed}/${totalSessionsOrDays}) ${usedAmount.toLocaleString()}원 및 공정위 법정 위약금(${penaltyRatePercent}%) ${penaltyAmount.toLocaleString()}원이 공제되었습니다.`,
  };
}

// ============================================================================
// 계약 갱신/만료 사전 D-Day 알림 연동
// ============================================================================

export interface ContractRenewalNotificationTarget {
  contractId: string;
  contractNumber: string;
  customerName: string;
  customerPhone: string;
  endDate: string;
  daysRemaining: number;
  notificationType: 'D_30' | 'D_14' | 'EXPIRED';
  messageBody: string;
}

/**
 * 만료 임박(30일/14일 전) 계약 필터링 및 갱신 안내 알림톡 문구 생성 (순수 함수)
 */
export function getExpiringContractsForRenewalNotification(
  contracts: readonly SignedContract[],
  referenceDate?: string
): ContractRenewalNotificationTarget[] {
  const refDateStr = referenceDate || new Date().toISOString().slice(0, 10);
  const refTime = new Date(refDateStr).getTime();

  const results: ContractRenewalNotificationTarget[] = [];

  for (const c of contracts) {
    if (c.status === 'TERMINATED' || c.status === 'REFUNDED') continue;

    const endTime = new Date(c.endDate).getTime();
    const diffDays = Math.ceil((endTime - refTime) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      results.push({
        contractId: c.id,
        contractNumber: c.contractNumber,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        endDate: c.endDate,
        daysRemaining: diffDays,
        notificationType: 'EXPIRED',
        messageBody: `[알림] ${c.customerName} 고객님의 '${c.title}' 계약이 만료되었습니다. 재등록 및 연장을 원하시면 문의 바랍니다.`,
      });
    } else if (diffDays <= 14) {
      results.push({
        contractId: c.id,
        contractNumber: c.contractNumber,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        endDate: c.endDate,
        daysRemaining: diffDays,
        notificationType: 'D_14',
        messageBody: `[D-14 만료 사전 안내] ${c.customerName} 고객님의 '${c.title}' 계약 만료일이 14일 남았습니다(${c.endDate}). 사전 갱신 시 전용 할인 혜택이 적용됩니다.`,
      });
    } else if (diffDays <= 30) {
      results.push({
        contractId: c.id,
        contractNumber: c.contractNumber,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        endDate: c.endDate,
        daysRemaining: diffDays,
        notificationType: 'D_30',
        messageBody: `[D-30 갱신 안내] ${c.customerName} 고객님의 '${c.title}' 계약 만료일이 30일 남았습니다(${c.endDate}).`,
      });
    }
  }

  return results.sort((a, b) => a.daysRemaining - b.daysRemaining);
}

