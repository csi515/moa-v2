/**
 * 레거시 기본 지출 카테고리(공통 + 피아노).
 * 전용 플러그인이 없거나 훅을 주지 않는 업종의 현재 동작이다.
 * 라벨·value는 바꾸지 않는다.
 */
export interface DefaultExpenseCategory {
  value: string;
  label: string;
}

export const DEFAULT_COMMON_EXPENSE_CATEGORIES: DefaultExpenseCategory[] = [
  { value: 'rent', label: '임대료' },
  { value: 'utility', label: '관리비/공과금' },
  { value: 'maintenance', label: '시설 유지보수' },
  { value: 'salary', label: '인건비/급여' },
  { value: 'supplies', label: '소모품/비품' },
  { value: 'marketing', label: '홍보/마케팅' },
  { value: 'insurance', label: '보험' },
  { value: 'tax', label: '세금/공과' },
  { value: 'other', label: '기타' },
];

export const DEFAULT_PIANO_EXPENSE_CATEGORIES: DefaultExpenseCategory[] = [
  { value: 'piano_tuning', label: '피아노 조율/수리' },
  { value: 'textbook', label: '교재/악보 구입' },
  { value: 'snacks', label: '간식/다과' },
  { value: 'teacher_salary', label: '강사료' },
];

export function defaultExpenseCategories(): DefaultExpenseCategory[] {
  return [...DEFAULT_COMMON_EXPENSE_CATEGORIES, ...DEFAULT_PIANO_EXPENSE_CATEGORIES];
}
