import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const commissionPayrollResources: CapabilityResourceDefinition = {
  capabilityId: 'commission_payroll',
  resources: [
    {
      name: 'commission_payroll',
      list: '/commission-payroll',
      create: '/commission-payroll/new',
      show: '/commission-payroll/:id',
      edit: '/commission-payroll/:id/edit',
      meta: {
        label: '인센티브·정산',
        icon: 'Calculator',
        order: 220,
      },
    },
  ],
};
