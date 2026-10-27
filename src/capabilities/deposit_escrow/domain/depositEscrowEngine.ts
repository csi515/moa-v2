export type DepositEscrowStatus =
  | 'held' // 보증금 예치 완료 (예약 확정)
  | 'checked_in' // 고객 방문 확인
  | 'deducted_settled' // 최종 결제 시 보증금 전액 차감 완료
  | 'refunded' // 24시간 전 사전 취소로 전액 환불
  | 'forfeited_noshow'; // 당일 노쇼로 인한 보증금 몰수 (매장 위약금 전입)

export interface DepositEscrowRecord {
  id: string;
  bookingId: string;
  customerName: string;
  serviceName: string; // 예: "파티룸 올나잇 패키지", "1:1 PT 세션"
  totalEstimatedFee: number; // 총 서비스 금액 (예: 150,000원)
  depositAmount: number; // 사전 보증금 (예: 50,000원)
  status: DepositEscrowStatus;
  bookingScheduledAt: string; // 예약 일시 ISO
  createdAt: string;
  settledAt?: string;
  finalPaidAmount?: number; // 차감 후 실제 결제액 (예: 100,000원)
  forfeitedPenaltyAmount?: number; // 노쇼 시 몰수액
}

export interface DepositPolicyConfig {
  freeCancellationHours: number; // 전액 환불 가능 시간 기준 (기본: 24시간)
  lateCancellationPenaltyRate: number; // 24시간 이내 취소 시 위약금 요율 (0~1, 기본: 1.0 몰수)
}

export const DEFAULT_DEPOSIT_POLICY: DepositPolicyConfig = {
  freeCancellationHours: 24,
  lateCancellationPenaltyRate: 1.0,
};

/**
 * 최종 결제 시 기납부 보증금을 자동 차감하여 실납부액을 산출합니다.
 */
export function calculateFinalSettlement(params: {
  totalServiceFee: number;
  depositAmount: number;
}): {
  totalServiceFee: number;
  depositAmount: number;
  netPayableAmount: number; // 고객이 현장에서 추가 납부할 잔여액
  isFullyCovered: boolean; // 보증금으로 전체 금액이 상쇄되었는지 여부
} {
  const netPayable = Math.max(0, params.totalServiceFee - params.depositAmount);
  return {
    totalServiceFee: params.totalServiceFee,
    depositAmount: params.depositAmount,
    netPayableAmount: netPayable,
    isFullyCovered: netPayable === 0,
  };
}

/**
 * 취소 시점과 예약 일시를 비교하여 환불 가능액 및 노쇼 위약금 몰수액을 산출합니다.
 */
export function evaluateCancellationRefund(params: {
  bookingScheduledAt: string;
  cancellationRequestedAt: string;
  depositAmount: number;
  policy?: DepositPolicyConfig;
}): {
  hoursBefore: number;
  isFreeCancellation: boolean;
  refundAmount: number;
  penaltyForfeitAmount: number;
  suggestedStatus: 'refunded' | 'forfeited_noshow';
} {
  const policy = params.policy || DEFAULT_DEPOSIT_POLICY;
  const scheduledTime = new Date(params.bookingScheduledAt).getTime();
  const cancelTime = new Date(params.cancellationRequestedAt).getTime();
  const diffHours = (scheduledTime - cancelTime) / (1000 * 60 * 60);

  if (diffHours >= policy.freeCancellationHours) {
    return {
      hoursBefore: Math.max(0, Math.round(diffHours * 10) / 10),
      isFreeCancellation: true,
      refundAmount: params.depositAmount,
      penaltyForfeitAmount: 0,
      suggestedStatus: 'refunded',
    };
  }

  const penalty = Math.round(params.depositAmount * policy.lateCancellationPenaltyRate);
  const refund = Math.max(0, params.depositAmount - penalty);

  return {
    hoursBefore: Math.max(0, Math.round(diffHours * 10) / 10),
    isFreeCancellation: false,
    refundAmount: refund,
    penaltyForfeitAmount: penalty,
    suggestedStatus: 'forfeited_noshow',
  };
}

/**
 * 보증금 에스크로 목록 전체의 재무 지표를 집계합니다.
 */
export function summarizeDepositEscrowMetrics(records: DepositEscrowRecord[]): {
  totalActiveHeldDeposit: number; // 현재 묶여있는 에스크로 보증금 총액
  totalSettledDeductions: number; // 최종 결제 시 차감 정산된 누적 보증금
  totalForfeitedPenaltyIncome: number; // 노쇼로 인해 매장 수입으로 전환된 위약금
  totalRefundedDeposit: number; // 정상 취소 환불액
} {
  let totalActiveHeldDeposit = 0;
  let totalSettledDeductions = 0;
  let totalForfeitedPenaltyIncome = 0;
  let totalRefundedDeposit = 0;

  for (const record of records) {
    if (record.status === 'held' || record.status === 'checked_in') {
      totalActiveHeldDeposit += record.depositAmount;
    } else if (record.status === 'deducted_settled') {
      totalSettledDeductions += record.depositAmount;
    } else if (record.status === 'forfeited_noshow') {
      totalForfeitedPenaltyIncome += record.forfeitedPenaltyAmount ?? record.depositAmount;
    } else if (record.status === 'refunded') {
      totalRefundedDeposit += record.depositAmount;
    }
  }

  return {
    totalActiveHeldDeposit,
    totalSettledDeductions,
    totalForfeitedPenaltyIncome,
    totalRefundedDeposit,
  };
}
