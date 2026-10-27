import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const soundBroadcastScheduleResources: CapabilityResourceDefinition = {
  capabilityId: 'sound_broadcast_schedule',
  resources: [
    {
      name: 'broadcast_schedules',
      list: '/sound-broadcasts',
      meta: {
        label: '원내 안내방송 스케줄러',
        icon: 'Volume2',
        order: 135,
      },
    },
  ],
};
