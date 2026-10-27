import { defineCapability } from '../_shared/capabilityTypes';

export const field_audit_trailCapability = defineCapability({
  id: 'field_audit_trail',
  displayName: '필드 단위 데이터 변경 감사 추적',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
