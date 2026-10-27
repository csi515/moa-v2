import { defineCapability } from '../_shared/capabilityTypes';

export const vendor_scorecardCapability = defineCapability({
  id: 'vendor_scorecard',
  displayName: '거래처 공급업체 다면 평가표',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
