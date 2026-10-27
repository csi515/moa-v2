import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const vendorScorecardResources: CapabilityResourceDefinition = {
  capabilityId: 'vendor_scorecard',
  resources: [
    {
      name: 'vendor_evaluations',
      list: '/vendor-scorecards',
      meta: {
        label: '거래처 다면 평가표',
        icon: 'Award',
        order: 166,
      },
    },
  ],
};
