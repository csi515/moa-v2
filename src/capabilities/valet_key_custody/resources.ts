import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const valetKeyCustodyResources: CapabilityResourceDefinition = {
  capabilityId: 'valet_key_custody',
  resources: [
    {
      name: 'valet_tickets',
      list: '/valet-custody',
      meta: {
        label: '발렛 차량 키 보관',
        icon: 'Key',
        order: 132,
      },
    },
  ],
};
