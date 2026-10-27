import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const lostCardRfidResources: CapabilityResourceDefinition = {
  capabilityId: 'lost_card_rfid',
  resources: [
    {
      name: 'rfid_cards',
      list: '/rfid-cards',
      meta: {
        label: '출입 카드 발급 대장',
        icon: 'CreditCard',
        order: 131,
      },
    },
  ],
};
