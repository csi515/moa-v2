import { defineCapability } from '../_shared/capabilityTypes';

export const hazardous_waste_logCapability = defineCapability({
  id: 'hazardous_waste_log',
  displayName: '의료·유해 폐기물 및 폐약제 배출 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
