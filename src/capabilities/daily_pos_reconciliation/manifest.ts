import { defineCapability } from '../_shared/capabilityTypes';

export const daily_pos_reconciliationCapability = defineCapability({
  id: 'daily_pos_reconciliation',
  displayName: '일일 현금 시재금 마감 및 금고 실사',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
