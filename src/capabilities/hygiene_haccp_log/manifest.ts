import { defineCapability } from '../_shared/capabilityTypes';

export const hygiene_haccp_logCapability = defineCapability({
  id: 'hygiene_haccp_log',
  displayName: '주방위생·보건증',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['hygiene_log:read', 'hygiene_log:write'],
});
