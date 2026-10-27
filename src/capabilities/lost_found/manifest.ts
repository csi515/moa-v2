import { defineCapability } from '../_shared/capabilityTypes';

export const lost_foundCapability = defineCapability({
  id: 'lost_found',
  displayName: '시설 분실물 보관',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
