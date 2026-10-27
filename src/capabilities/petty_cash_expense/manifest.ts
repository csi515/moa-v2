import { defineCapability } from '../_shared/capabilityTypes';

export const petty_cash_expenseCapability = defineCapability({
  id: 'petty_cash_expense',
  displayName: '소액 현금 지출 증빙 및 영수증 실사 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
