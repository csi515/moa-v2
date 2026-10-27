import type { PaymentMethod, TeacherPayType } from './billingLedgerTypes';

/** 공통 지출 카테고리 */
export type CoreExpenseCategory =
  | 'rent'
  | 'utility'
  | 'maintenance'
  | 'salary'
  | 'supplies'
  | 'marketing'
  | 'insurance'
  | 'tax'
  | 'other';

/** 공통 수입 카테고리 */
export type CoreIncomeCategory =
  | 'membership'
  | 'session'
  | 'product'
  | 'rental'
  | 'grant'
  | 'other';

export interface FinanceExpense {
  id: string;
  date: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  recipient?: string;
  vendor?: string;
  memo?: string;
  receiptMemo?: string;
  teacherId?: string;
  settlementYearMonth?: string;
  settlementKind?: 'teacher_payroll';
  settlementPayType?: TeacherPayType;
  settlementQuantity?: number;
  settlementRate?: number;
  settlementCalculatedAmount?: number;
  settlementAdjustmentAmount?: number;
  settlementAdjustmentReason?: string;
}

export interface IncomeEntry {
  id: string;
  date: string;
  category: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description: string;
  payer?: string;
  memo?: string;
  sourceType?: 'manual' | 'tuition' | 'textbook' | 'booking' | 'retail';
  sourceId?: string;
}

export interface FinanceMonthSummary {
  yearMonth: string;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
}

export interface FinanceSummary {
  currentYearMonth: string;
  totalIncomeThisMonth: number;
  totalExpenseThisMonth: number;
  netProfitThisMonth: number;
  linkedIncomeThisMonth: number;
  manualIncomeThisMonth: number;
  monthlyTrend: FinanceMonthSummary[];
}
