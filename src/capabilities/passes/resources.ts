import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const passesResources: CapabilityResourceDefinition = {
  capabilityId: 'passes',
  resources: [
    {
      name: 'passes',
      list: '/passes',
      create: '/passes/new',
      show: '/passes/:id',
      meta: {
        label: '수강권·회원권',
        icon: 'Ticket',
        order: 30,
      },
    },
  ],
};
