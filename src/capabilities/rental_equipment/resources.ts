import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const rentalEquipmentResources: CapabilityResourceDefinition = {
  capabilityId: 'rental_equipment',
  resources: [
    {
      name: 'rental_equipments',
      list: '/rentals',
      create: '/rentals/new',
      show: '/rentals/:id',
      meta: {
        label: '비품·대여 관리',
        icon: 'Layers',
        order: 70,
      },
    },
  ],
};
