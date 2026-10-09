import { defineCapability } from '../_shared/capabilityTypes';

export const passesCapability = defineCapability({
  id: 'passes',
  displayName: '수강권·회원권',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
