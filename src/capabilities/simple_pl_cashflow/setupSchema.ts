import type { CapabilitySetupSchema } from '@/core/presets/types';

export const simplePlCashflowSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'simple_pl_cashflow',
  title: '간이 손익 및 현금흐름 설정',
  description: '매장의 최소 안전 현금 유보액 및 적자 위험 사전 경고 기준을 설정합니다.',
  fields: [
    {
      id: 'min_safe_cash_reserve',
      label: '최소 안전 현금 유보액 (원)',
      type: 'number',
      defaultValue: 5000000,
      description: '월말 예상 잔고가 이 금액 미만으로 떨어질 때 자금 경고를 표시합니다.',
    },
    {
      id: 'default_fixed_rent',
      label: '기본 월 고정 임차료 (원)',
      type: 'number',
      defaultValue: 1500000,
      description: '손익 계산 시 자동으로 반영될 기본 사업장 월세입니다.',
    },
  ],
};
