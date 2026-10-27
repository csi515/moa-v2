import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const certificateIssuanceResources: CapabilityResourceDefinition = {
  capabilityId: 'certificate_issuance',
  resources: [
    {
      name: 'issued_certificates',
      list: '/certificates',
      meta: {
        label: '증명서·수료증 발급 대장',
        icon: 'Award',
        order: 136,
      },
    },
  ],
};
