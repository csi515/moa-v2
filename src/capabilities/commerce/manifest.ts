import { defineCapability } from '../_shared/capabilityTypes';

export const commerceCapability = defineCapability({
  id: 'commerce',
  displayName: '판매',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
