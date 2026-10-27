import { defineCapability } from '../_shared/capabilityTypes';

export const baby_food_coopCapability = defineCapability({
  id: 'baby_food_coop',
  displayName: '이유식품앗이·정산',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
