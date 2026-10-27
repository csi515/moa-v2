import type { IndustryExpenseCategory } from '@/core/industry/pluginTypes';
import { COMMON_EXPENSE_CATEGORIES, SKIN_EXPENSE_CATEGORIES } from '@/capabilities/billing/finance/categories';

export function skinExpenseCategories(): IndustryExpenseCategory[] {
  return [...COMMON_EXPENSE_CATEGORIES, ...SKIN_EXPENSE_CATEGORIES];
}
