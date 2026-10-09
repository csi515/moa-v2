import { defineCapability } from '../_shared/capabilityTypes';

export const rental_equipmentCapability = defineCapability({
  id: 'rental_equipment',
  displayName: '기구·비품 대여',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
