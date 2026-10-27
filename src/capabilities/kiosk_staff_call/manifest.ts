import { defineCapability } from '../_shared/capabilityTypes';

export const kiosk_staff_callCapability = defineCapability({
  id: 'kiosk_staff_call',
  displayName: '스마트호출·벨보드',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['staff_call:read', 'staff_call:write'],
});
