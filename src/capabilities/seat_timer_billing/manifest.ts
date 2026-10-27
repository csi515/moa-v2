import { defineCapability } from '../_shared/capabilityTypes';

export const seat_timer_billingCapability = defineCapability({
  id: 'seat_timer_billing',
  displayName: '좌석타이머·초과과금',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
