import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const prepaidTaxWithholdingResources: CapabilityResourceDefinition = {
  capabilityId: 'prepaid_tax_withholding',
  resources: [
    {
      name: 'withholding_tax_ledgers',
      list: '/tax-withholdings',
      meta: {
        label: '3.3% 원천징수 원장',
        icon: 'Percent',
        order: 151,
      },
    },
  ],
};
