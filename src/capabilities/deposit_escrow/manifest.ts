import { defineCapability } from '../_shared/capabilityTypes';

export const deposit_escrowCapability = defineCapability({
  id: 'deposit_escrow',
  displayName: '예약보증금·노쇼방지',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['deposit:read', 'deposit:write'],
});
