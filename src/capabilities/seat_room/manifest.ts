import { defineCapability } from '../_shared/capabilityTypes';

export const seat_roomCapability = defineCapability({
  id: 'seat_room',
  displayName: '공간·좌석 점유',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
