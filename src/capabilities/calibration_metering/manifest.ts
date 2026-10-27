import { defineCapability } from '../_shared/capabilityTypes';

export const calibration_meteringCapability = defineCapability({
  id: 'calibration_metering',
  displayName: '정밀 계측기·의료장비 정기 검교정 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
