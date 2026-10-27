import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const calibrationMeteringResources: CapabilityResourceDefinition = {
  capabilityId: 'calibration_metering',
  resources: [
    {
      name: 'calibration_devices',
      list: '/calibration-devices',
      meta: {
        label: '정밀 장비 검교정 대장',
        icon: 'Gauge',
        order: 141,
      },
    },
  ],
};
