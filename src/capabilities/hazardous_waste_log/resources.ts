import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const hazardousWasteLogResources: CapabilityResourceDefinition = {
  capabilityId: 'hazardous_waste_log',
  resources: [
    {
      name: 'waste_discharge_logs',
      list: '/hazardous-waste',
      meta: {
        label: '유해·의료 폐기물 대장',
        icon: 'Biohazard',
        order: 143,
      },
    },
  ],
};
