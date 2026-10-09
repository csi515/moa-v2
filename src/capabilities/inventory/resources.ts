import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const inventoryResources: CapabilityResourceDefinition = {
  capabilityId: 'inventory',
  resources: [
    {
      name: 'inventory_items',
      list: '/inventory',
      create: '/inventory/new',
      edit: '/inventory/:id/edit',
      meta: {
        label: '재고·자재 관리',
        icon: 'Package',
        order: 50,
      },
    },
  ],
};
