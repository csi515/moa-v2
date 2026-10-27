import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const trial_funnelResources: CapabilityResourceDefinition = {
  capabilityId: 'trial_funnel',
  resources: [
    {
      name: 'trial_leads',
      list: '/trial-funnel',
      show: '/trial-funnel/:id',
      create: '/trial-funnel/create',
      edit: '/trial-funnel/edit/:id',
      meta: {
        label: '체험·상담 파이프라인',
        icon: 'Sparkles',
        order: 183,
      },
    },
  ],
};
