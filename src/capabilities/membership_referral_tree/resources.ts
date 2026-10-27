import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const membershipReferralTreeResources: CapabilityResourceDefinition = {
  capabilityId: 'membership_referral_tree',
  resources: [
    {
      name: 'membership_referral_tree',
      list: '/family-tree',
      create: '/family-tree/new',
      show: '/family-tree/:id',
      edit: '/family-tree/:id/edit',
      meta: {
        label: '패밀리·형제할인',
        icon: 'Users',
        order: 350,
      },
    },
  ],
};
