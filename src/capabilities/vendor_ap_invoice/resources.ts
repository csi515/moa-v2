import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const vendorApInvoiceResources: CapabilityResourceDefinition = {
  capabilityId: 'vendor_ap_invoice',
  resources: [
    {
      name: 'vendor_ap_invoice',
      list: '/vendor-ap',
      create: '/vendor-ap/new',
      show: '/vendor-ap/:id',
      edit: '/vendor-ap/:id/edit',
      meta: {
        label: '공급처·매입세무',
        icon: 'Truck',
        order: 380,
      },
    },
  ],
};
