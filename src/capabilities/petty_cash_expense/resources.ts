import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const pettyCashExpenseResources: CapabilityResourceDefinition = {
  capabilityId: 'petty_cash_expense',
  resources: [
    {
      name: 'petty_cash_expenses',
      list: '/petty-cash',
      meta: {
        label: '소액 지출 증빙 대장',
        icon: 'Receipt',
        order: 150,
      },
    },
  ],
};
