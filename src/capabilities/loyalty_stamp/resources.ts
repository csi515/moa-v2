import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const loyaltyStampResources: CapabilityResourceDefinition = {
  capabilityId: 'loyalty_stamp',
  resources: [
    {
      name: 'loyalty_stamp',
      list: '/loyalty-stamps',
      create: '/loyalty-stamps/new',
      show: '/loyalty-stamps/:id',
      edit: '/loyalty-stamps/:id/edit',
      meta: {
        label: '전자스탬프·칭찬도장',
        icon: 'Award',
        order: 390,
      },
    },
  ],
};
