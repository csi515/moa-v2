import { defineCapability } from '../_shared/capabilityTypes';

export const energy_utility_meterCapability = defineCapability({
  id: 'energy_utility_meter',
  displayName: '구역별 관리비 분할 검침 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
