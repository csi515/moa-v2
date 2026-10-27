import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const seatTimerBillingResources: CapabilityResourceDefinition = {
  capabilityId: 'seat_timer_billing',
  resources: [
    {
      name: 'seat_timers',
      list: '/seat-timers',
      create: '/seat-timers/new',
      show: '/seat-timers/:id',
      edit: '/seat-timers/:id/edit',
      meta: {
        label: '좌석·타이머보드',
        icon: 'Hourglass',
        order: 260,
      },
    },
  ],
};
