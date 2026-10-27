import { defineCapability } from '../_shared/capabilityTypes';

export const consumable_dispenserCapability = defineCapability({
  id: 'consumable_dispenser',
  displayName: '사내 소모품 자율 불출 및 부서별 비용 배부',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
