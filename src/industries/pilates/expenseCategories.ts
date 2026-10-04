import type { IndustryExpenseCategory } from '@/core/industry/pluginTypes';
import { COMMON_EXPENSE_CATEGORIES, PILATES_EXPENSE_CATEGORIES } from '@/capabilities/billing/finance/categories';

export function pilatesExpenseCategories(): IndustryExpenseCategory[] {
  return [...COMMON_EXPENSE_CATEGORIES, ...PILATES_EXPENSE_CATEGORIES];
}
