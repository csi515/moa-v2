import { defineCapability } from '../_shared/capabilityTypes';

export const certificate_issuanceCapability = defineCapability({
  id: 'certificate_issuance',
  displayName: '증명서·수료증 채번 및 위변조 검증 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
