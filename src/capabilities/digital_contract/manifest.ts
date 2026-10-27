import { defineCapability } from '../_shared/capabilityTypes';

export const digital_contractCapability = defineCapability({
  id: 'digital_contract',
  displayName: '전자계약·환불동의',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
