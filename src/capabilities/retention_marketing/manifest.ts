import { defineCapability } from '../_shared/capabilityTypes';

export const retention_marketingCapability = defineCapability({
  id: 'retention_marketing',
  displayName: '자동리텐션마케팅',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
