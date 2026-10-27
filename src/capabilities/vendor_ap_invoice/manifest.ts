import { defineCapability } from '../_shared/capabilityTypes';

export const vendor_ap_invoiceCapability = defineCapability({
  id: 'vendor_ap_invoice',
  displayName: '공급처·매입세무',
  dependencies: ['inventory'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
