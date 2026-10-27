import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const waitlistQueueResources: CapabilityResourceDefinition = {
  capabilityId: 'waitlist_queue',
  resources: [
    {
      name: 'booking_waitlists',
      list: '/workspace/waitlist',
      meta: {
        label: '취소 대기열 관리',
        icon: 'UserCheck',
        order: 115,
      },
    },
  ],
};
