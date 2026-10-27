import { defineCapability } from '../_shared/capabilityTypes';

export const vehicle_shuttleCapability = defineCapability({
  id: 'vehicle_shuttle',
  displayName: '안심통학·셔틀관제',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
