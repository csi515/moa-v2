import type { IndustryFinanceHubNav } from '@/core/industry/pluginTypes';

/** 피아노 재무 허브. 다른 업종 매니페스트에는 두지 않는다. */
export const pianoFinanceHubNav: IndustryFinanceHubNav = {
  title: '수납·재무',
  financeTabSegment: 'tuition',
  showLinkedBillingIncome: true,
  areas: [
    {
      id: 'billing',
      label: '수납',
      hint: '청구 · 미납',
      entrySegment: 'tuition',
      menuLabel: '수납 메뉴',
      segments: [
        { value: 'tuition', label: '수납', description: '월 수강료 청구·수납 처리' },
        { value: 'unpaid', label: '미납', description: '미납 학생·금액을 확인하고 수납' },
      ],
    },
    {
      id: 'books',
      label: '재무 관리',
      hint: '수입 · 지출 · 정산',
      entrySegment: 'income',
      menuLabel: '재무 관리 메뉴',
      segments: [
        { value: 'income', label: '수입', description: '수입 내역과 합계를 확인' },
        { value: 'expenses', label: '지출', description: '지출 내역과 합계를 확인' },
        { value: 'payroll', label: '정산', description: '강사 정산 확정 후 지출 등록' },
      ],
    },
  ],
};
