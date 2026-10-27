import { defineCapability } from '../_shared/capabilityTypes';

export const pickup_ordersCapability = defineCapability({
  id: 'pickup_orders',
  displayName: '사전예약·픽업칸반',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['orders:read', 'orders:write'],
});
