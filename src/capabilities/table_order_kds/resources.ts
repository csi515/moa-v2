import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const tableOrderKdsResources: CapabilityResourceDefinition = {
  capabilityId: 'table_order_kds',
  resources: [
    {
      name: 'kds_orders',
      list: '/kds',
      create: '/kds/new',
      show: '/kds/:id',
      edit: '/kds/:id/edit',
      meta: {
        label: '주방 KDS·테이블 주문',
        icon: 'UtensilsCrossed',
        order: 190,
      },
    },
  ],
};
