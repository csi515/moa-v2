import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const bookingResources: CapabilityResourceDefinition = {
  capabilityId: 'booking',
  resources: [
    {
      name: 'bookings',
      list: '/bookings',
      create: '/bookings/new',
      show: '/bookings/:id',
      meta: {
        label: '예약 관리',
        icon: 'CalendarClock',
        order: 20,
      },
    },
  ],
};
