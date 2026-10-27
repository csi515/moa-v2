import { defineCapability } from '../_shared/capabilityTypes';

export const service_warranty_claimCapability = defineCapability({
  id: 'service_warranty_claim',
  displayName: '시술·서비스 하자 무상보증(A/S) 및 리터치 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
