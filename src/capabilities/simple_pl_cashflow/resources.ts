import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const simplePlCashflowResources: CapabilityResourceDefinition = {
  capabilityId: 'simple_pl_cashflow',
  resources: [
    {
      name: 'financial_statements',
      list: '/pl-cashflows',
      meta: {
        label: '매장 손익 & 현금흐름',
        icon: 'TrendingUp',
        order: 160,
      },
    },
  ],
};
