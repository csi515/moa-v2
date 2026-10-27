export type OverbudgetPolicy = 'block' | 'warn_only';

export interface BudgetItemQuota {
  id: string;
  categoryName: string;
  monthlyLimit: number;
  currentSpent: number;
  yearMonth: string; // 'YYYY-MM'
  overbudgetPolicy: OverbudgetPolicy;
}

export function calculateRemainingBudget(limit: number, spent: number): number {
  return limit - spent;
}

export function calculateBudgetUsageRate(limit: number, spent: number): number {
  if (limit <= 0) return 100;
  return Math.round((spent / limit) * 1000) / 10;
}

export function checkSpendEligibility(
  limit: number,
  spent: number,
  newExpense: number,
  policy: OverbudgetPolicy
): {
  isAllowed: boolean;
  projectedSpent: number;
  overAmount: number;
  warningMessage?: string;
} {
  const projectedSpent = spent + newExpense;
  const overAmount = Math.max(0, projectedSpent - limit);

  if (overAmount > 0) {
    if (policy === 'block') {
      return {
        isAllowed: false,
        projectedSpent,
        overAmount,
        warningMessage: `월 예산 한도(${limit.toLocaleString()}원)를 ${overAmount.toLocaleString()}원 초과하여 지출 결재가 차단되었습니다.`,
      };
    } else {
      return {
        isAllowed: true,
        projectedSpent,
        overAmount,
        warningMessage: `월 예산 한도(${limit.toLocaleString()}원)를 ${overAmount.toLocaleString()}원 초과했습니다. 원장 특별 승인 후 집행하십시오.`,
      };
    }
  }

  return {
    isAllowed: true,
    projectedSpent,
    overAmount: 0,
  };
}
