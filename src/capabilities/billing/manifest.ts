import { defineCapability } from '../_shared/capabilityTypes';

export const billingCapability = defineCapability({
  id: 'billing',
  displayName: '수납',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
