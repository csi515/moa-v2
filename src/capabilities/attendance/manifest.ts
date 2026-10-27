import { defineCapability } from '../_shared/capabilityTypes';

export const attendanceCapability = defineCapability({
  id: 'attendance',
  displayName: '출결',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
