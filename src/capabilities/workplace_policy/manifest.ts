import { defineCapability } from '../_shared/capabilityTypes';

export const workplace_policyCapability = defineCapability({
  id: 'workplace_policy',
  displayName: '매장 내규·사규 관리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
