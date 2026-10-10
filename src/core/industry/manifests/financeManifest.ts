import type { IndustryExpenseCategory, IndustryFinanceHubNav } from '../pluginTypes';

/**
 * Finance / Billing capability 전용 매니페스트.
 * IndustryPluginManifest에서 finance 관련 설정만 분리한다.
 */
export type FinancePluginManifest = {
  feeLabel?: string;
  bankAccountPlaceholder?: string;
  supportsDeposit?: boolean;
  showsTextbooksLink?: boolean;
  includesLinkedBillingIncome?: boolean;
  getExpenseCategories?: () => readonly IndustryExpenseCategory[];
  getPayrollExpenseCategory?: () => string;
  financeHubNav?: IndustryFinanceHubNav;
};

