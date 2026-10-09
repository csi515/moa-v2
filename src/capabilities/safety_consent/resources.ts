import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const safetyConsentResources: CapabilityResourceDefinition = {
  capabilityId: 'safety_consent',
  resources: [
    {
      name: 'safety_consents',
      list: '/consents',
      create: '/consents/sign',
      show: '/consents/:id',
      meta: {
        label: '전자 동의·서약서',
        icon: 'FileSignature',
        order: 170,
      },
    },
  ],
};
