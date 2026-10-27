import { defineCapability } from '../_shared/capabilityTypes';

export const sublease_space_contractCapability = defineCapability({
  id: 'sublease_space_contract',
  displayName: '샵인샵 전대차 계약 및 매출 쉐어 정산',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
