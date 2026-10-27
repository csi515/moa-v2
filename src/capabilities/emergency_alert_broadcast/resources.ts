import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const emergency_alert_broadcastResources: CapabilityResourceDefinition = {
  capabilityId: 'emergency_alert_broadcast',
  resources: [
    {
      name: 'emergency_broadcasts',
      list: '/emergency-broadcasts',
      create: '/emergency-broadcasts/create',
      show: '/emergency-broadcasts/:id',
      meta: {
        label: '긴급 휴원 공고',
        order: 214,
      },
    },
  ],
};

export const emergencyAlertBroadcastResources = emergency_alert_broadcastResources;
