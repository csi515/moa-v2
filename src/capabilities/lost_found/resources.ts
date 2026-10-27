import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const lostFoundResources: CapabilityResourceDefinition = {
  capabilityId: 'lost_found',
  resources: [
    {
      name: 'lost_found',
      list: '/lost-found',
      create: '/lost-found/new',
      show: '/lost-found/:id',
      edit: '/lost-found/:id/edit',
      meta: {
        label: '분실물 관리',
        icon: 'PackageSearch',
        order: 230,
      },
    },
  ],
};
