/**
 * 소액 현금 지출 증빙 및 영수증 실사 대장 도메인 엔진 (Pure Functions)
 */

export type ExpenseCategory =
  | 'SUPPLIES'
  | 'SNACKS_BEVERAGE'
  | 'MAINTENANCE_REPAIR'
  | 'DELIVERY_FEE'
  | 'MISCELLANEOUS';

export type ExpenseApprovalStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface PettyCashExpenseRecord {
  id: string;
  tenant_id: string;
  claimant_name: string;
  category: ExpenseCategory;
  expense_title: string;
  amount: number;
  receipt_image_url?: string;
  merchant_name?: string; // 거래처 상호
  spent_at: string;
  status: ExpenseApprovalStatus;
  approved_by?: string;
  rejection_reason?: string;
}

export function deductPettyCash(
  currentFundBalance: number,
  expenseAmount: number
): { remainingBalance: number; isSufficient: boolean; error?: string } {
  if (expenseAmount <= 0) {
    return { remainingBalance: currentFundBalance, isSufficient: false, error: '지출 금액은 0원보다 커야 합니다.' };
  }
  if (currentFundBalance < expenseAmount) {
    return {
      remainingBalance: currentFundBalance,
      isSufficient: false,
      error: `전도금 잔액(${currentFundBalance.toLocaleString()}원)이 부족합니다.`,
    };
  }
  return { remainingBalance: currentFundBalance - expenseAmount, isSufficient: true };
}

export function validateExpenseClaim(
  title: string,
  amount: number,
  claimant: string
): { isValid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: '지출 항목명을 입력해 주세요.' };
  }
  if (amount <= 0) {
    return { isValid: false, error: '올바른 지출 금액을 입력해 주세요.' };
  }
  if (!claimant || claimant.trim().length === 0) {
    return { isValid: false, error: '지출 신청자 이름을 입력해 주세요.' };
  }
  return { isValid: true };
}
