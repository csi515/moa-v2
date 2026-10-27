import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const fieldDispatchResources: CapabilityResourceDefinition = {
  capabilityId: 'field_dispatch',
  resources: [
    {
      name: 'dispatch_orders',
      list: '/workspace/dispatch',
      meta: {
        label: '출장 및 방문 파견',
        icon: 'Truck',
        order: 110,
      },
    },
  ],
};
