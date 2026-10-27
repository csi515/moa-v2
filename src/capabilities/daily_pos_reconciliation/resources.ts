import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const dailyPosReconciliationResources: CapabilityResourceDefinition = {
  capabilityId: 'daily_pos_reconciliation',
  resources: [
    {
      name: 'daily_pos_reconciliations',
      list: '/pos-reconciliations',
      meta: {
        label: '일일 시재금 마감',
        icon: 'Calculator',
        order: 130,
      },
    },
  ],
};
