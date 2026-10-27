import type { CapabilitySetupSchema } from '@/core/presets/types';

export const pettyCashExpenseSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'petty_cash_expense',
  title: '소액 현금 전도금 설정',
  description: '매장 비치 소액 현금(전도금) 기본 한도 및 1회 지출 결재 한도를 설정합니다.',
  fields: [
    {
      id: 'default_imprest_fund',
      label: '전도금 기본 보유 한도(원)',
      type: 'number',
      defaultValue: 300000,
      description: '금고에 상시 비치하는 소액 경비 전도금 기준 잔액입니다.',
    },
    {
      id: 'single_expense_approval_limit',
      label: '1회 자율 지출 한도(원)',
      type: 'number',
      defaultValue: 50000,
      description: '사전 승인 없이 직원이 현금 영수증 제출로 즉시 지출 가능한 1회 한도입니다.',
    },
  ],
};
