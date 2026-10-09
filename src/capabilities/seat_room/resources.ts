import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const seatRoomResources: CapabilityResourceDefinition = {
  capabilityId: 'seat_room',
  resources: [
    {
      name: 'seat_rooms',
      list: '/seat-rooms',
      show: '/seat-rooms/:id',
      meta: {
        label: '공간·좌석 현황',
        icon: 'LayoutGrid',
        order: 60,
      },
    },
  ],
};
