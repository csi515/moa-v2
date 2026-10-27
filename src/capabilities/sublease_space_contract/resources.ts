import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const subleaseSpaceContractResources: CapabilityResourceDefinition = {
  capabilityId: 'sublease_space_contract',
  resources: [
    {
      name: 'sublease_contracts',
      list: '/sublease-contracts',
      meta: {
        label: '샵인샵 전대차 계약',
        icon: 'Store',
        order: 140,
      },
    },
  ],
};
