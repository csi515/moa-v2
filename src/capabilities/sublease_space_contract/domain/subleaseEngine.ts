/**
 * 샵인샵 전대차 계약 및 매출 쉐어 정산 도메인 엔진 (Pure Functions)
 */

export type SubleaseFeeType = 'FIXED_RENT' | 'REVENUE_SHARE' | 'HYBRID';

export interface SubleaseContractRecord {
  id: string;
  tenant_id: string;
  subtenant_name: string; // 입점 업체/사업자명
  space_description: string; // 예: "입구 우측 네일존 (15㎡)"
  fee_type: SubleaseFeeType;
  deposit_amount: number;
  fixed_monthly_rent: number;
  revenue_share_percent: number; // 0~100 %
  utility_fixed_fee: number;
  contract_start: string;
  contract_end: string;
  is_active: boolean;
}

export interface SubleaseSettlementResult {
  baseRent: number;
  commissionFee: number;
  utilityFee: number;
  totalSettlementAmount: number;
}

export function computeMonthlySubleaseSettlement(
  contract: SubleaseContractRecord,
  monthlyGrossRevenue: number
): SubleaseSettlementResult {
  let baseRent = 0;
  let commissionFee = 0;

  switch (contract.fee_type) {
    case 'FIXED_RENT':
      baseRent = contract.fixed_monthly_rent;
      break;

    case 'REVENUE_SHARE':
      commissionFee = Math.round((monthlyGrossRevenue * contract.revenue_share_percent) / 100);
      break;

    case 'HYBRID':
      baseRent = contract.fixed_monthly_rent;
      const share = Math.round((monthlyGrossRevenue * contract.revenue_share_percent) / 100);
      // 최저 보장 임대료를 초과하는 수수료만 가산하거나 둘 중 큰 값
      commissionFee = Math.max(0, share - baseRent);
      break;
  }

  const utilityFee = contract.utility_fixed_fee;
  const totalSettlementAmount = baseRent + commissionFee + utilityFee;

  return {
    baseRent,
    commissionFee,
    utilityFee,
    totalSettlementAmount,
  };
}

export function validateContractDates(start: string, end: string): { isValid: boolean; error?: string } {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { isValid: false, error: '유효한 계약 시작일과 종료일을 입력해 주세요.' };
  }
  if (startDate.getTime() >= endDate.getTime()) {
    return { isValid: false, error: '계약 종료일은 시작일보다 이후여야 합니다.' };
  }
  return { isValid: true };
}
