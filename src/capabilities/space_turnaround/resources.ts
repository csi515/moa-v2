import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const space_turnaroundResources: CapabilityResourceDefinition = {
  capabilityId: 'space_turnaround',
  resources: [
    {
      name: 'space_turnarounds',
      list: '/space-turnaround',
      show: '/space-turnaround/:id',
      create: '/space-turnaround/create',
      edit: '/space-turnaround/edit/:id',
      meta: {
        label: '공간 턴어라운드',
        icon: 'Sparkles',
        order: 186,
      },
    },
  ],
};
