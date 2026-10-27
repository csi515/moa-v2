import { defineCapability } from '../_shared/capabilityTypes';

export const leave_managementCapability = defineCapability({
  id: 'leave_management',
  displayName: '시간 단위 정밀 휴가 및 근태 차감 관리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
