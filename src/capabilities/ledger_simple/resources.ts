import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const ledgerSimpleResources: CapabilityResourceDefinition = {
  capabilityId: 'ledger_simple',
  resources: [
    {
      name: 'simple_ledgers',
      list: '/ledger',
      create: '/ledger/new',
      meta: {
        label: '간이 장부·시재마감',
        icon: 'BookOpenCheck',
        order: 130,
      },
    },
  ],
};
