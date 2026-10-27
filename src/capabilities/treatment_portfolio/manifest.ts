import { defineCapability } from '../_shared/capabilityTypes';

export const treatment_portfolioCapability = defineCapability({
  id: 'treatment_portfolio',
  displayName: '스타일북·업셀링',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
