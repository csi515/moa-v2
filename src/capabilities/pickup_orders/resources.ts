import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const pickupOrdersResources: CapabilityResourceDefinition = {
  capabilityId: 'pickup_orders',
  resources: [
    {
      name: 'pickup_orders',
      list: '/pickup-orders',
      create: '/pickup-orders/new',
      show: '/pickup-orders/:id',
      edit: '/pickup-orders/:id/edit',
      meta: {
        label: '사전예약·픽업칸반',
        icon: 'PackageCheck',
        order: 380,
      },
    },
  ],
};
