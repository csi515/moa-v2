import type { IndustryExpenseCategory } from '@/core/industry/pluginTypes';
import { COMMON_EXPENSE_CATEGORIES, PIANO_EXPENSE_CATEGORIES } from '@/capabilities/billing/finance/categories';

/** 사우나·찜질방은 기존 fallthrough와 같이 피아노와 같은 지출 카테고리를 쓴다. */
export function bathExpenseCategories(): IndustryExpenseCategory[] {
  return [...COMMON_EXPENSE_CATEGORIES, ...PIANO_EXPENSE_CATEGORIES];
}
