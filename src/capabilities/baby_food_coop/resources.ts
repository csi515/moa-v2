import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const babyFoodCoopResources: CapabilityResourceDefinition = {
  capabilityId: 'baby_food_coop',
  resources: [
    {
      name: 'baby_food_coop',
      list: '/workspace/baby-food',
      meta: {
        label: '이유식 품앗이',
        icon: 'Baby',
        order: 250,
      },
    },
    {
      name: 'baby_food_settlement',
      list: '/workspace/baby-food/settlement',
      meta: {
        label: '품앗이 정산 장부',
        icon: 'Calculator',
        order: 251,
        parent: 'baby_food_coop',
      },
    },
  ],
};
