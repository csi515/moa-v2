import { defineCapability } from '../_shared/capabilityTypes';

export const prepaid_tax_withholdingCapability = defineCapability({
  id: 'prepaid_tax_withholding',
  displayName: '강사·프리랜서 3.3% 사업소득세 원천징수 원장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
