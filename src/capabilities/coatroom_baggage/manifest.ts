import { defineCapability } from '../_shared/capabilityTypes';

export const coatroom_baggageCapability = defineCapability({
  id: 'coatroom_baggage',
  displayName: '외투 및 단기 수하물 보관 번호표 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
