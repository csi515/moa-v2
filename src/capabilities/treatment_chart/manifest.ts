import { defineCapability } from '../_shared/capabilityTypes';

export const treatment_chartCapability = defineCapability({
  id: 'treatment_chart',
  displayName: '시술·케어히스토리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
