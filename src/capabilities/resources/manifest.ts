import { defineCapability } from '../_shared/capabilityTypes';

export const resourcesCapability = defineCapability({
  id: 'resources',
  displayName: '자원',
  dependencies: ['booking'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
