import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const waitlistTurnQueueResources: CapabilityResourceDefinition = {
  capabilityId: 'waitlist_turn_queue',
  resources: [
    {
      name: 'waitlist_turn_queue',
      list: '/turn-queue',
      create: '/turn-queue/new',
      show: '/turn-queue/:id',
      edit: '/turn-queue/:id/edit',
      meta: {
        label: '순번대기·호출보드',
        icon: 'Volume2',
        order: 290,
      },
    },
  ],
};
