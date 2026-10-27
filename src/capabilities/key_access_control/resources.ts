import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const keyAccessControlResources: CapabilityResourceDefinition = {
  capabilityId: 'key_access_control',
  resources: [
    {
      name: 'access_keys',
      list: '/access-keys',
      meta: {
        label: '물리 열쇠·도어락 대장',
        icon: 'KeyRound',
        order: 142,
      },
    },
  ],
};
