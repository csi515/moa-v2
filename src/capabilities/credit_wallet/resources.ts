import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const creditWalletResources: CapabilityResourceDefinition = {
  capabilityId: 'credit_wallet',
  resources: [
    {
      name: 'credit_wallets',
      list: '/wallets',
      show: '/wallets/:id',
      meta: {
        label: '선불 충전·포인트',
        icon: 'WalletCards',
        order: 140,
      },
    },
  ],
};
