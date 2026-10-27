import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const procurement3WayMatchResources: CapabilityResourceDefinition = {
  capabilityId: 'procurement_3way_match',
  resources: [
    {
      name: 'procurement_matches',
      list: '/procurement-3way',
      meta: {
        label: '구매 3-Way 매칭 대장',
        icon: 'CheckSquare',
        order: 162,
      },
    },
  ],
};
