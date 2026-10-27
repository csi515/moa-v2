import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const lockerEmergencyOverrideResources: CapabilityResourceDefinition = {
  capabilityId: 'locker_emergency_override',
  resources: [
    {
      name: 'locker_overrides',
      list: '/locker-overrides',
      meta: {
        label: '사물함 비상 개방 감사',
        icon: 'ShieldAlert',
        order: 134,
      },
    },
  ],
};
