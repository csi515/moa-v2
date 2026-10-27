import { defineCapability } from '../_shared/capabilityTypes';

export const locker_emergency_overrideCapability = defineCapability({
  id: 'locker_emergency_override',
  displayName: '사물함 비상 개방 입회 서약 및 감사 로그',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
