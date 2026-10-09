import { defineCapability } from '../_shared/capabilityTypes';

export const shift_scheduleCapability = defineCapability({
  id: 'shift_schedule',
  displayName: '근무표·알바정산',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
