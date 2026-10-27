import { defineCapability } from '../_shared/capabilityTypes';

export const fefo_lot_trackerCapability = defineCapability({
  id: 'fefo_lot_tracker',
  displayName: '원자재 FEFO 유통기한 선출 & 로트 추적 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
