import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const vehicleShuttleResources: CapabilityResourceDefinition = {
  capabilityId: 'vehicle_shuttle',
  resources: [
    {
      name: 'shuttle_routes',
      list: '/shuttle',
      create: '/shuttle/new',
      show: '/shuttle/:id',
      edit: '/shuttle/:id/edit',
      meta: {
        label: '안심 통학·셔틀 관제',
        icon: 'Bus',
        order: 210,
      },
    },
    {
      name: 'shuttle_stops',
      list: '/shuttle/stops',
      meta: {
        label: '셔틀 정류장 순서',
        parent: 'shuttle_routes',
      },
    },
    {
      name: 'shuttle_ride_requests',
      list: '/shuttle/requests',
      meta: {
        label: '임직원 탑승 신청',
        parent: 'shuttle_routes',
      },
    },
  ],
};
