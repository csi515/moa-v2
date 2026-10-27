import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const consumableDispenserResources: CapabilityResourceDefinition = {
  capabilityId: 'consumable_dispenser',
  resources: [
    {
      name: 'consumable_dispenses',
      list: '/consumable-dispenser',
      meta: {
        label: '소모품 자율 불출 대장',
        icon: 'Box',
        order: 144,
      },
    },
  ],
};
