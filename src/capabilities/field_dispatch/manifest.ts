import { defineCapability } from '../_shared/capabilityTypes';

export const field_dispatchCapability = defineCapability({
  id: 'field_dispatch',
  displayName: '출장 및 방문 파견 관리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
