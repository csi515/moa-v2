import { defineCapability } from '../_shared/capabilityTypes';

export const uniform_safety_gearCapability = defineCapability({
  id: 'uniform_safety_gear',
  displayName: '유니폼 및 보호구 사이즈별 지급·회수 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
