import { defineCapability } from '../_shared/capabilityTypes';

export const credit_walletCapability = defineCapability({
  id: 'credit_wallet',
  displayName: '선불충전·포인트',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
