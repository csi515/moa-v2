import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const uniformSafetyGearResources: CapabilityResourceDefinition = {
  capabilityId: 'uniform_safety_gear',
  resources: [
    {
      name: 'uniform_assignments',
      list: '/uniform-gear',
      meta: {
        label: '유니폼·보호구 지급 대장',
        icon: 'Shirt',
        order: 149,
      },
    },
  ],
};
