import { defineCapability } from '../_shared/capabilityTypes';

export const commission_payrollCapability = defineCapability({
  id: 'commission_payroll',
  displayName: '프리랜서·인센티브 정산',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
