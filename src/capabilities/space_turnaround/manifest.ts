import { defineCapability } from '../_shared/capabilityTypes';

export const space_turnaroundCapability = defineCapability({
  id: 'space_turnaround',
  displayName: '공간 턴어라운드 및 정비 버퍼',
  dependencies: ['seat_room'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
