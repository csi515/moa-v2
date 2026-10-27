import { defineCapability } from '../_shared/capabilityTypes';

export const parentCapability = defineCapability({
  id: 'parent',
  displayName: '보호자 포털',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
