import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const shiftScheduleResources: CapabilityResourceDefinition = {
  capabilityId: 'shift_schedule',
  resources: [
    {
      name: 'shift_schedules',
      list: '/shifts',
      create: '/shifts/new',
      edit: '/shifts/:id/edit',
      meta: {
        label: '근무표·알바정산',
        icon: 'CalendarDays',
        order: 100,
      },
    },
  ],
};
