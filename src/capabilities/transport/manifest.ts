import { defineCapability } from '../_shared/capabilityTypes';

export const transportCapability = defineCapability({
  id: 'transport',
  displayName: '차량',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
