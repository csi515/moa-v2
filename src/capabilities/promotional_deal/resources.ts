import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const promotionalDealResources: CapabilityResourceDefinition = {
  capabilityId: 'promotional_deal',
  resources: [
    {
      name: 'promotional_deals',
      list: '/promotional-deals',
      meta: {
        label: '기간 한정 특가 & 이벤트',
        icon: 'Tag',
        order: 120,
      },
    },
  ],
};
