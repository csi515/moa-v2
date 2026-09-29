import type { IndustryType } from '@/core/industry/types';
import { isAppointmentIndustry, isSkinClinicIndustry } from '@/core/industry/industryUi';

export interface CategoryOption {
  value: string;
  label: string;
}

/** 업종 공통 지출 카테고리 */
export const COMMON_EXPENSE_CATEGORIES: CategoryOption[] = [
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

/** 피아노 학원 추가 지출 카테고리 */
export const PIANO_EXPENSE_CATEGORIES: CategoryOption[] = [
  { value: 'piano_tuning', label: '피아노 조율/수리' },
  { value: 'textbook', label: '교재/악보 구입' },
  { value: 'snacks', label: '간식/다과' },
  { value: 'teacher_salary', label: '강사료' },
];

/** 피부관리샵 추가 지출 카테고리 */
export const SKIN_EXPENSE_CATEGORIES: CategoryOption[] = [
  { value: 'products', label: '관리 용품' },
  { value: 'cleaning', label: '청소/위생' },
  { value: 'instructor_fee', label: '관리사 수당' },
];

/** 필라테스 스튜디오 추가 지출 카테고리 */
export const PILATES_EXPENSE_CATEGORIES: CategoryOption[] = [
  { value: 'equipment', label: '기구/장비' },
  { value: 'cleaning', label: '청소/위생' },
  { value: 'instructor_fee', label: '강사료' },
];

/** 업종 공통 수입 카테고리 */
export const COMMON_INCOME_CATEGORIES: CategoryOption[] = [
  { value: 'membership', label: '회원권/정기 수입' },
  { value: 'session', label: '수업/세션 매출' },
  { value: 'product', label: '상품 판매' },
  { value: 'rental', label: '대관/임대 수입' },
  { value: 'grant', label: '지원금/보조금' },
  { value: 'other', label: '기타 수입' },
];

/** 체육관 추가 지출 카테고리 */
export const GYM_EXPENSE_CATEGORIES: CategoryOption[] = [
  { value: 'equipment', label: '운동 용품/장비' },
  { value: 'uniform', label: '유니폼/복장' },
  { value: 'competition', label: '대회/행사 비용' },
  { value: 'instructor_fee', label: '강사료' },
];

/** 어린이집 추가 지출 카테고리 */
export const DAYCARE_EXPENSE_CATEGORIES: CategoryOption[] = [
  { value: 'meals', label: '급식/간식' },
  { value: 'toys', label: '교구/완구' },
  { value: 'field_trip', label: '체험학습/행사' },
  { value: 'teacher_salary', label: '교사 인건비' },
];

export function getExpenseCategories(industry: IndustryType | string): CategoryOption[] {
  const base = [...COMMON_EXPENSE_CATEGORIES];
  if (isSkinClinicIndustry(industry)) {
    return [...base, ...SKIN_EXPENSE_CATEGORIES];
  }
  if (isAppointmentIndustry(industry)) {
    return [...base, ...PILATES_EXPENSE_CATEGORIES];
  }
  if (industry === 'gym' || industry === 'taekwondo') {
    return [...base, ...GYM_EXPENSE_CATEGORIES];
  }
  if (industry === 'daycare') {
    return [...base, ...DAYCARE_EXPENSE_CATEGORIES];
  }
  return [...base, ...PIANO_EXPENSE_CATEGORIES];
}

export function getIncomeCategories(_industry: IndustryType | string): CategoryOption[] {
  return COMMON_INCOME_CATEGORIES;
}

export function getCategoryLabel(
  categories: CategoryOption[],
  value?: string
): string {
  if (!value) return '기타';
  return categories.find((c) => c.value === value)?.label || value;
}

const YEAR_MONTH_RE = /^\d{4}-\d{2}$/;

/** 로컬 기준 YYYY-MM (UTC toISOString 월 밀림 방지) */
export function toLocalYearMonth(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function formatYearMonthOption(ym: string): { value: string; label: string } {
  const [y, m] = ym.split('-').map(Number);
  return { value: ym, label: `${y}년 ${m}월` };
}

function shiftYearMonth(ym: string, deltaMonths: number): string {
  const [y, m] = ym.split('-').map(Number);
  return toLocalYearMonth(new Date(y, m - 1 + deltaMonths, 1));
}

/**
 * 월 선택 옵션.
 * - 데이터가 있으면 가장 이른 월 ~ 가장 늦은 월을 연속으로 포함 (중간 빈 월도 선택 가능)
 * - 현재월·미래 여유·과거 최소 보장도 반영해 데이터 없는 월 조회 가능
 * - 최신월이 앞에 오도록 정렬
 */
export function buildYearMonthOptions(params?: {
  dataYearMonths?: Iterable<string | undefined | null>;
  /** 현재월 기준 과거 최소 보장 개월 (기본 12) */
  pastMonths?: number;
  /** 현재월 기준 미래 조회 가능 개월 (기본 6) */
  futureMonths?: number;
}): { value: string; label: string }[] {
  const pastMonths = params?.pastMonths ?? 12;
  const futureMonths = params?.futureMonths ?? 6;
  const nowYm = toLocalYearMonth();

  const data: string[] = [];
  for (const raw of params?.dataYearMonths ?? []) {
    if (!raw) continue;
    const ym = String(raw).slice(0, 7);
    if (YEAR_MONTH_RE.test(ym)) data.push(ym);
  }

  let start = nowYm;
  let end = nowYm;
  if (data.length > 0) {
    start = data.reduce((a, b) => (a < b ? a : b));
    end = data.reduce((a, b) => (a > b ? a : b));
  }

  const paddedStart = shiftYearMonth(nowYm, -Math.max(pastMonths, 0));
  const paddedEnd = shiftYearMonth(nowYm, Math.max(futureMonths, 0));
  if (paddedStart < start) start = paddedStart;
  if (paddedEnd > end) end = paddedEnd;
  if (nowYm < start) start = nowYm;
  if (nowYm > end) end = nowYm;

  const result: { value: string; label: string }[] = [];
  let cursor = end;
  while (cursor >= start) {
    result.push(formatYearMonthOption(cursor));
    if (cursor === start) break;
    cursor = shiftYearMonth(cursor, -1);
  }
  return result;
}

/** 최근 N개월 YYYY-MM 목록 (하위 호환 — 데이터 구간 확장 시 buildYearMonthOptions 사용) */
export function getRecentYearMonths(count = 12): { value: string; label: string }[] {
  return buildYearMonthOptions({
    pastMonths: Math.max(count - 1, 0),
    futureMonths: 0,
  });
}
