import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const vipConciergePreferenceResources: CapabilityResourceDefinition = {
  capabilityId: 'vip_concierge_preference',
  resources: [
    {
      name: 'vip_profiles',
      list: '/vip-profiles',
      meta: {
        label: 'VIP 고객 의전 노트',
        icon: 'Crown',
        order: 157,
      },
    },
  ],
};
