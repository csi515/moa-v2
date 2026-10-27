import { defineCapability } from '../_shared/capabilityTypes';

export const customer_blacklist_guardCapability = defineCapability({
  id: 'customer_blacklist_guard',
  displayName: '악성 민원 및 출입제한 통제',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
