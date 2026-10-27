import { defineCapability } from '../_shared/capabilityTypes';

export const waitlist_turn_queueCapability = defineCapability({
  id: 'waitlist_turn_queue',
  displayName: '현장 순번대기·호출보드',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['waitlist:read', 'waitlist:write'],
});
