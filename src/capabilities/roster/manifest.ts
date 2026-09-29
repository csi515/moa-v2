import { defineCapability } from '../_shared/capabilityTypes';

export const rosterCapability = defineCapability({
  id: 'roster',
  displayName: '명부',
  dependencies: [],
  configurable: true,
  defaultEnabled: true,
  requiredPermissions: [],
});
