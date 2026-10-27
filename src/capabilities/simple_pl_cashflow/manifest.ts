import { defineCapability } from '../_shared/capabilityTypes';

export const simple_pl_cashflowCapability = defineCapability({
  id: 'simple_pl_cashflow',
  displayName: '매장 간이 손익계산서 & 현금흐름 예측기',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
