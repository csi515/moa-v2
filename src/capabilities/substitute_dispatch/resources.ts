import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const substitute_dispatchResources: CapabilityResourceDefinition = {
  capabilityId: 'substitute_dispatch',
  resources: [
    {
      name: 'substitute_requests',
      list: '/substitute-dispatch/requests',
      show: '/substitute-dispatch/requests/:id',
      meta: {
        label: '대강 긴급 호출',
        order: 205,
      },
    },
    {
      name: 'substitute_bids',
      list: '/substitute-dispatch/bids',
      meta: {
        label: '대강 지원 내역',
        order: 206,
      },
    },
  ],
};

export const substituteDispatchResources = substitute_dispatchResources;
