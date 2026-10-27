import { defineCapability } from '../_shared/capabilityTypes';

export const nda_privacy_auditCapability = defineCapability({
  id: 'nda_privacy_audit',
  displayName: '개인정보 열람 감사 로그 및 파기 관리 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
