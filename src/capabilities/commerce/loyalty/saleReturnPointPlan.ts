/**
 * 판매 반품 시 포인트 비례 배분.
 * - 적립 취소(clawback)·사용 복구(restore) 모두 동일 공식.
 * - 전량 반품 완료 시 floor 잔여분을 마지막 반품에 흡수.
 */

export function allocateReturnPointSlice(params: {
  /** 원 판매에서 적립/사용된 포인트(양수) */
  originalPoints: number;
  /** 원 판매 상품 합계(원) */
  saleTotalAmount: number;
  /** 이번 반품 이전까지 반품 금액 합(원) */
  priorReturnedAmount: number;
  /** 이번 반품 금액(원) */
  thisReturnAmount: number;
  /** 이번 반품 이전까지 이미 배분된 포인트 */
  priorAllocatedPoints: number;
}): number {
  const original = Math.max(0, Math.floor(Number(params.originalPoints) || 0));
  const saleTotal = Math.max(0, Number(params.saleTotalAmount) || 0);
  const priorRet = Math.max(0, Number(params.priorReturnedAmount) || 0);
  const thisRet = Math.max(0, Number(params.thisReturnAmount) || 0);
  const priorAlloc = Math.max(0, Math.floor(Number(params.priorAllocatedPoints) || 0));

  if (original <= 0 || saleTotal <= 0 || thisRet <= 0) return 0;
  if (priorAlloc >= original) return 0;

  const cumulative = Math.min(saleTotal, priorRet + thisRet);

  // 전량 반품(누적)이면 잔여 포인트 전부
  if (cumulative >= saleTotal) {
    return Math.max(0, original - priorAlloc);
  }

  const targetCumulative = Math.floor((original * cumulative) / saleTotal);
  return Math.max(0, targetCumulative - priorAlloc);
}

export type SaleReturnPointPlan = {
  earnClawback: number;
  redeemRestore: number;
};

/**
 * 이번 반품에 적용할 적립 취소·사용 복구 포인트.
 */
export function planSaleReturnPointAdjustments(params: {
  saleTotalAmount: number;
  pointsEarned: number;
  pointsRedeemed: number;
  thisReturnAmount: number;
  priorReturnedAmount: number;
  priorEarnClawed: number;
  priorRedeemRestored: number;
}): SaleReturnPointPlan {
  return {
    earnClawback: allocateReturnPointSlice({
      originalPoints: params.pointsEarned,
      saleTotalAmount: params.saleTotalAmount,
      priorReturnedAmount: params.priorReturnedAmount,
      thisReturnAmount: params.thisReturnAmount,
      priorAllocatedPoints: params.priorEarnClawed,
    }),
    redeemRestore: allocateReturnPointSlice({
      originalPoints: params.pointsRedeemed,
      saleTotalAmount: params.saleTotalAmount,
      priorReturnedAmount: params.priorReturnedAmount,
      thisReturnAmount: params.thisReturnAmount,
      priorAllocatedPoints: params.priorRedeemRestored,
    }),
  };
}

export const POINT_RETURN_REF_TYPE = 'sale_return' as const;
export const POINT_RETURN_EARN_CLAWBACK_DESC_PREFIX = '반품 적립 취소' as const;
export const POINT_RETURN_REDEEM_RESTORE_DESC_PREFIX = '반품 사용 복구' as const;
