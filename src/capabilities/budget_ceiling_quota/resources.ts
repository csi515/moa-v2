import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const budgetCeilingQuotaResources: CapabilityResourceDefinition = {
  capabilityId: 'budget_ceiling_quota',
  resources: [
    {
      name: 'budget_quotas',
      list: '/budget-ceilings',
      meta: {
        label: '월 예산 한도 통제',
        icon: 'PieChart',
        order: 164,
      },
    },
  ],
};
