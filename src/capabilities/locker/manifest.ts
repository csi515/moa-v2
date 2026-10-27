import { defineCapability } from '../_shared/capabilityTypes';

export const lockerCapability = defineCapability({
  id: 'locker',
  displayName: '락커·사물함',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
