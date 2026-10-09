import { defineCapability } from '../_shared/capabilityTypes';

export const billing_invoicingCapability = defineCapability({
  id: 'billing_invoicing',
  displayName: '정기청구·미수원장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
