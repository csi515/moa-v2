import { defineCapability } from '../_shared/capabilityTypes';

export const key_access_controlCapability = defineCapability({
  id: 'key_access_control',
  displayName: '물리 열쇠 대여 및 도어락 비밀번호 교체 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
