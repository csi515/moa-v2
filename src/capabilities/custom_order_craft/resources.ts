import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const customOrderCraftResources: CapabilityResourceDefinition = {
  capabilityId: 'custom_order_craft',
  resources: [
    {
      name: 'custom_craft_orders',
      list: '/custom-orders',
      meta: {
        label: '주문 제작 공정 칸반',
        icon: 'Hammer',
        order: 154,
      },
    },
  ],
};
