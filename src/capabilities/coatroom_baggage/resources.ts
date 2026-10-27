import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const coatroomBaggageResources: CapabilityResourceDefinition = {
  capabilityId: 'coatroom_baggage',
  resources: [
    {
      name: 'coatroom_claims',
      list: '/coatroom-baggage',
      meta: {
        label: '외투·수하물 보관',
        icon: 'Briefcase',
        order: 133,
      },
    },
  ],
};
