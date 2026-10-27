import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const depositEscrowResources: CapabilityResourceDefinition = {
  capabilityId: 'deposit_escrow',
  resources: [
    {
      name: 'deposit_escrow',
      list: '/deposit-escrow',
      create: '/deposit-escrow/new',
      show: '/deposit-escrow/:id',
      edit: '/deposit-escrow/:id/edit',
      meta: {
        label: '예약보증금·노쇼방지',
        icon: 'ShieldCheck',
        order: 300,
      },
    },
  ],
};
