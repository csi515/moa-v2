import type { IndustryExpenseCategory } from '@/core/industry/pluginTypes';
import { COMMON_EXPENSE_CATEGORIES, GYM_EXPENSE_CATEGORIES } from '@/capabilities/billing/finance/categories';

/** 태권도 alias도 이 체육관 목록을 쓴다. */
export function gymExpenseCategories(): IndustryExpenseCategory[] {
  return [...COMMON_EXPENSE_CATEGORIES, ...GYM_EXPENSE_CATEGORIES];
}
