import { defineCapability } from '../_shared/capabilityTypes';

export const loyalty_stampCapability = defineCapability({
  id: 'loyalty_stamp',
  displayName: '전자스탬프·칭찬도장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['loyalty:read', 'loyalty:write'],
});
