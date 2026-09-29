import { defineCapability } from '../_shared/capabilityTypes';

export const schedulingCapability = defineCapability({
  id: 'scheduling',
  displayName: '일정',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
