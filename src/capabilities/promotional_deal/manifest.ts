import { defineCapability } from '../_shared/capabilityTypes';

export const promotional_dealCapability = defineCapability({
  id: 'promotional_deal',
  displayName: '기간 한정 특가 & 이벤트 스케줄러',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
