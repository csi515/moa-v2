import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const customerBlacklistGuardResources: CapabilityResourceDefinition = {
  capabilityId: 'customer_blacklist_guard',
  resources: [
    {
      name: 'blacklist_records',
      list: '/blacklist-guard',
      meta: {
        label: '출입 제한 및 블랙리스트',
        icon: 'Ban',
        order: 137,
      },
    },
  ],
};
