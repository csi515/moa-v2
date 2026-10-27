import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const parking_validatorResources: CapabilityResourceDefinition = {
  capabilityId: 'parking_validator',
  resources: [
    {
      name: 'parking_registrations',
      list: '/parking-registrations',
      create: '/parking-registrations/create',
      show: '/parking-registrations/:id',
      meta: {
        label: '주차 등록 및 정산',
        order: 213,
      },
    },
  ],
};

export const parkingValidatorResources = parking_validatorResources;
