import type { IndustryExpenseCategory } from '@/core/industry/pluginTypes';
import { COMMON_EXPENSE_CATEGORIES, PIANO_EXPENSE_CATEGORIES } from '@/capabilities/billing/finance/categories';

/** 피아노 학원 지출 카테고리(공통 포함). 빈 업종 값도 이 목록이다. */
export function pianoExpenseCategories(): IndustryExpenseCategory[] {
  return [...COMMON_EXPENSE_CATEGORIES, ...PIANO_EXPENSE_CATEGORIES];
}
