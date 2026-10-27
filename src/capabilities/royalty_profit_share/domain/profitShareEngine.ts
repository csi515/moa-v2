/**
 * 동업자·파트너 지분별 손익 안분 계산기 도메인 엔진 (Pure Functions)
 */

export interface EquityPartner {
  partner_id: string;
  partner_name: string;
  equity_ratio_percent: number; // 지분율 (합산 100%)
}

export interface PartnerDistribution {
  partner_id: string;
  partner_name: string;
  equity_ratio_percent: number;
  dividend_amount: number;
}

export interface ProfitShareRecord {
  id: string;
  tenant_id: string;
  settlement_month: string; // "YYYY-MM"
  total_revenue: number;
  total_expenses: number;
  net_profit: number; // revenue - expenses
  reserve_rate_percent: number;
  reserve_amount: number;
  distributable_profit: number;
  distributions: PartnerDistribution[];
  is_confirmed: boolean;
  settled_at: string;
}

export function validateEquityRatios(partners: EquityPartner[]): { isValid: boolean; error?: string } {
  if (!partners || partners.length === 0) {
    return { isValid: false, error: '최소 1인 이상의 파트너가 필요합니다.' };
  }
  const totalRatio = partners.reduce((sum, p) => sum + p.equity_ratio_percent, 0);
  // 부동소수점 오차 감안
  if (Math.abs(totalRatio - 100) > 0.01) {
    return { isValid: false, error: `파트너 지분율 합계는 100%여야 합니다 (현재: ${totalRatio}%).` };
  }
  return { isValid: true };
}

export function computeProfitDistribution(
  totalRevenue: number,
  totalExpenses: number,
  reserveRatePercent: number,
  partners: EquityPartner[]
): {
  netProfit: number;
  reserveAmount: number;
  distributableProfit: number;
  distributions: PartnerDistribution[];
} {
  const netProfit = totalRevenue - totalExpenses;
  if (netProfit <= 0) {
    // 적자 발생 시 배당금 0원 및 결손 유지
    return {
      netProfit,
      reserveAmount: 0,
      distributableProfit: 0,
      distributions: partners.map((p) => ({
        partner_id: p.partner_id,
        partner_name: p.partner_name,
        equity_ratio_percent: p.equity_ratio_percent,
        dividend_amount: 0,
      })),
    };
  }

  const reserveAmount = Math.round((netProfit * reserveRatePercent) / 100);
  const distributableProfit = netProfit - reserveAmount;

  const distributions = partners.map((p) => ({
    partner_id: p.partner_id,
    partner_name: p.partner_name,
    equity_ratio_percent: p.equity_ratio_percent,
    dividend_amount: Math.round((distributableProfit * p.equity_ratio_percent) / 100),
  }));

  return { netProfit, reserveAmount, distributableProfit, distributions };
}
