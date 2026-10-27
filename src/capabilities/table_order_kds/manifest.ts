import { defineCapability } from '../_shared/capabilityTypes';

export const table_order_kdsCapability = defineCapability({
  id: 'table_order_kds',
  displayName: '주방KDS·테이블주문',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
