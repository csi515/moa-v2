import { defineCapability } from '../_shared/capabilityTypes';

export const royalty_profit_shareCapability = defineCapability({
  id: 'royalty_profit_share',
  displayName: '동업자·파트너 지분별 손익 안분 계산기',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
