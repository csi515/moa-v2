import type { CapabilitySetupSchema } from '@/core/presets/types';

export const dailyPosReconciliationSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'daily_pos_reconciliation',
  title: '일일 현금 시재금 마감 설정',
  description: '영업 시작 시재금 기준액과 마감 시 허용 오차 한도를 설정합니다.',
  fields: [
    {
      id: 'default_opening_cash',
      label: '기본 개점 준비금(원)',
      type: 'number',
      defaultValue: 100000,
      description: '매일 영업 시작 시 금고에 기본으로 비치해야 하는 잔돈 준비금입니다.',
    },
    {
      id: 'allow_discrepancy_threshold',
      label: '허용 시재 차액 한도(원)',
      type: 'number',
      defaultValue: 0,
      description: '차액 발생 시 사유 소명 없이 마감 승인 가능한 한도 금액입니다.',
    },
  ],
};
