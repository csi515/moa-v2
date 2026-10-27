import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const lockerResources: CapabilityResourceDefinition = {
  capabilityId: 'locker',
  resources: [
    {
      name: 'lockers',
      list: '/lockers',
      create: '/lockers/new',
      edit: '/lockers/:id/edit',
      meta: {
        label: '락커·사물함',
        icon: 'Lock',
        order: 40,
      },
    },
  ],
};
