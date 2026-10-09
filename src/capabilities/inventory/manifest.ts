import { defineCapability } from '../_shared/capabilityTypes';

export const inventoryCapability = defineCapability({
  id: 'inventory',
  displayName: '재고·자재',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
