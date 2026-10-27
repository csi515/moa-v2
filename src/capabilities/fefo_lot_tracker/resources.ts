import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const fefoLotTrackerResources: CapabilityResourceDefinition = {
  capabilityId: 'fefo_lot_tracker',
  resources: [
    {
      name: 'fefo_lots',
      list: '/fefo-lots',
      meta: {
        label: 'FEFO 로트 유통기한 대장',
        icon: 'Clock',
        order: 163,
      },
    },
  ],
};
