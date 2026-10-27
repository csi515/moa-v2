export interface OperatingExpenses {
  labor: number; // 인건비
  rent: number; // 임차료
  utilities: number; // 관리비/공과금
  marketing: number; // 마케팅비
  others: number; // 기타비용
}

export interface MonthlyFinancialStatement {
  id: string;
  yearMonth: string; // 'YYYY-MM'
  grossRevenue: number;
  costOfGoodsSold: number;
  operatingExpenses: OperatingExpenses;
  currentCashBalance: number;
  expectedInflowsNextMonth: number;
  expectedOutflowsNextMonth: number;
}

export function calculateGrossProfit(revenue: number, cogs: number): number {
  return revenue - cogs;
}

export function calculateTotalOpex(opex: OperatingExpenses): number {
  return (
    opex.labor +
    opex.rent +
    opex.utilities +
    opex.marketing +
    opex.others
  );
}

export function calculateOperatingIncome(
  revenue: number,
  cogs: number,
  opex: OperatingExpenses
): number {
  const grossProfit = calculateGrossProfit(revenue, cogs);
  const totalOpex = calculateTotalOpex(opex);
  return grossProfit - totalOpex;
}

export function calculateOperatingMargin(revenue: number, operatingIncome: number): number {
  if (revenue <= 0) return 0;
  return Math.round((operatingIncome / revenue) * 1000) / 10; // 소수점 1자리 %
}

export function predictNextMonthCash(
  currentBalance: number,
  expectedInflow: number,
  expectedOutflow: number,
  safeReserveThreshold: number
): {
  projectedBalance: number;
  isDeficitRisk: boolean;
  shortfallAmount: number;
} {
  const projectedBalance = currentBalance + expectedInflow - expectedOutflow;
  const isDeficitRisk = projectedBalance < safeReserveThreshold;
  const shortfallAmount = isDeficitRisk ? Math.max(0, safeReserveThreshold - projectedBalance) : 0;

  return {
    projectedBalance,
    isDeficitRisk,
    shortfallAmount,
  };
}
