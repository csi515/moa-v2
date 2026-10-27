import type { CapabilitySetupSchema } from '@/core/presets/types';

export const budgetCeilingQuotaSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'budget_ceiling_quota',
  title: '월 예산 한도 통제 설정',
  description: '매장 부서별/항목별 지출이 월 예산을 초과할 때의 차단 정책을 설정합니다.',
  fields: [
    {
      id: 'default_overbudget_action',
      label: '예산 초과 시 기본 동작',
      type: 'text',
      defaultValue: 'block',
      description: '초과 시 승인 요청 자체를 차단(block)할지, 경고 후 진행(warn_only)할지 지정합니다.',
    },
    {
      id: 'alert_threshold_percent',
      label: '사전 예산 소진 경고율 (%)',
      type: 'number',
      defaultValue: 90,
      description: '예산이 이 비율 이상 소진되면 주황색 경고 뱃지를 표시합니다.',
    },
  ],
};
