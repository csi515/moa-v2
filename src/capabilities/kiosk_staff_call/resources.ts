import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const kioskStaffCallResources: CapabilityResourceDefinition = {
  capabilityId: 'kiosk_staff_call',
  resources: [
    {
      name: 'kiosk_staff_call',
      list: '/staff-call',
      create: '/staff-call/new',
      show: '/staff-call/:id',
      edit: '/staff-call/:id/edit',
      meta: {
        label: '스마트호출·벨보드',
        icon: 'BellRing',
        order: 340,
      },
    },
  ],
};
