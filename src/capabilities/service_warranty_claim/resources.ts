import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const serviceWarrantyClaimResources: CapabilityResourceDefinition = {
  capabilityId: 'service_warranty_claim',
  resources: [
    {
      name: 'service_warranty_claims',
      list: '/warranty-claims',
      meta: {
        label: '시술 A/S·리터치 보증',
        icon: 'Sparkles',
        order: 153,
      },
    },
  ],
};
