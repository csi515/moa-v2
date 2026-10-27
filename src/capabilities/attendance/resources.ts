import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const attendanceResources: CapabilityResourceDefinition = {
  capabilityId: 'attendance',
  resources: [
    {
      name: 'attendance',
      list: '/attendance',
      create: '/attendance/check-in',
      meta: {
        label: '출결 현황',
        icon: 'UserCheck',
        order: 10,
      },
    },
  ],
};
