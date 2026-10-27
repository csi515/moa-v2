import type { IndustryExpenseCategory } from '@/core/industry/pluginTypes';
import { COMMON_EXPENSE_CATEGORIES, DAYCARE_EXPENSE_CATEGORIES } from '@/capabilities/billing/finance/categories';

/** 유치원·preschool alias도 이 어린이집 목록을 쓴다. */
export function daycareExpenseCategories(): IndustryExpenseCategory[] {
  return [...COMMON_EXPENSE_CATEGORIES, ...DAYCARE_EXPENSE_CATEGORIES];
}
