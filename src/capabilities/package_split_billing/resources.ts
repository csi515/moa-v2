import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const packageSplitBillingResources: CapabilityResourceDefinition = {
  capabilityId: 'package_split_billing',
  resources: [
    {
      name: 'package_split_billing',
      list: '/package-billing',
      create: '/package-billing/new',
      show: '/package-billing/:id',
      edit: '/package-billing/:id/edit',
      meta: {
        label: '복합패키지·선수금',
        icon: 'PieChart',
        order: 320,
      },
    },
  ],
};
