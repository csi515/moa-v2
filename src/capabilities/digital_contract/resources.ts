import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const digitalContractResources: CapabilityResourceDefinition = {
  capabilityId: 'digital_contract',
  resources: [
    {
      name: 'digital_contracts',
      list: '/contracts',
      create: '/contracts/new',
      show: '/contracts/:id',
      edit: '/contracts/:id/edit',
      meta: {
        label: '전자계약·환불',
        icon: 'FileCheck2',
        order: 250,
      },
    },
  ],
};
