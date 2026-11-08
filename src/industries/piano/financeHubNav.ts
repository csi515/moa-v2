import type { IndustryFinanceHubNav } from '@/core/industry/pluginTypes';

/** 피아노 재무 허브 — 현장 학원 친화적 용어 적용. 다른 업종 매니페스트에는 두지 않는다. */
export const pianoFinanceHubNav: IndustryFinanceHubNav = {
  title: '수강료 수납 및 학원 장부',
  financeTabSegment: 'tuition',
  showLinkedBillingIncome: true,
  areas: [
    {
      id: 'billing',
      label: '수강료 수납',
      hint: '수강료 청구 · 미납',
      entrySegment: 'tuition',
      menuLabel: '수강료 수납 메뉴',
      segments: [
        { value: 'tuition', label: '수강료 수납', description: '월 수강료 청구 및 즉시 수납 처리' },
        { value: 'unpaid', label: '미납 관리', description: '미납 원생·금액을 확인하고 즉시 수납' },
      ],
    },
    {
      id: 'books',
      label: '학원 장부',
      hint: '수입 · 지출 · 강사료 정산',
      entrySegment: 'income',
      menuLabel: '학원 장부 메뉴',
      segments: [
        { value: 'income', label: '학원 수입', description: '수입 내역과 월별 합계를 확인' },
        { value: 'expenses', label: '학원 지출', description: '운영비·임대료·비품 지출 내역 관리' },
        { value: 'payroll', label: '선생님 급여·정산', description: '강사료 정산 확정 후 지출 등록' },
      ],
    },
  ],
};
