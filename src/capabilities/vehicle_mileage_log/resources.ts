import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const vehicleMileageLogResources: CapabilityResourceDefinition = {
  capabilityId: 'vehicle_mileage_log',
  resources: [
    {
      name: 'vehicle_mileage_logs',
      list: '/vehicle-mileage-logs',
      show: '/vehicle-mileage-logs/:id',
      create: '/vehicle-mileage-logs/create',
      edit: '/vehicle-mileage-logs/edit/:id',
      meta: {
        label: '차량 운행일지',
        icon: 'Car',
        order: 199,
      },
    },
  ],
};
