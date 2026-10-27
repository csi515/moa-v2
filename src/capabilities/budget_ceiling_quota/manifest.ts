import { defineCapability } from '../_shared/capabilityTypes';

export const budget_ceiling_quotaCapability = defineCapability({
  id: 'budget_ceiling_quota',
  displayName: '부서/항목별 월 예산 한도 통제기',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
