import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const energyUtilityMeterResources: CapabilityResourceDefinition = {
  capabilityId: 'energy_utility_meter',
  resources: [
    {
      name: 'utility_meter_readings',
      list: '/utility-meters',
      meta: {
        label: '구역별 관리비 검침',
        icon: 'Zap',
        order: 145,
      },
    },
  ],
};
