import { defineCapability } from '../_shared/capabilityTypes';

export const bookingCapability = defineCapability({
  id: 'booking',
  displayName: '예약',
  dependencies: ['scheduling'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
