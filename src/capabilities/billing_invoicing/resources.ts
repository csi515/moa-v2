import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const billingInvoicingResources: CapabilityResourceDefinition = {
  capabilityId: 'billing_invoicing',
  resources: [
    {
      name: 'billing_invoices',
      list: '/billing-invoices',
      create: '/billing-invoices/new',
      show: '/billing-invoices/:id',
      meta: {
        label: '정기 청구·수납',
        icon: 'Receipt',
        order: 120,
      },
    },
  ],
};
