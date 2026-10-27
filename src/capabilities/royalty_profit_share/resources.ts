import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const royaltyProfitShareResources: CapabilityResourceDefinition = {
  capabilityId: 'royalty_profit_share',
  resources: [
    {
      name: 'profit_share_distributions',
      list: '/profit-share',
      meta: {
        label: '동업자 손익 안분 배당',
        icon: 'PieChart',
        order: 152,
      },
    },
  ],
};
