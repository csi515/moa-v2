import { defineCapability } from '../_shared/capabilityTypes';

export const vip_concierge_preferenceCapability = defineCapability({
  id: 'vip_concierge_preference',
  displayName: 'VIP 고객 성향·알러지·의전 노트 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
