import { defineCapability } from '../_shared/capabilityTypes';

export const substitute_dispatchCapability = defineCapability({
  id: 'substitute_dispatch',
  displayName: '강사·직원 대진/대강 긴급 호출 및 승인 마켓',
  dependencies: ['shift_schedule'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['staff.manage', 'schedule.manage'],
});

export const substituteDispatchManifest = substitute_dispatchCapability;
