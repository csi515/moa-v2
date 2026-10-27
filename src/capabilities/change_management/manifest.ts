import { defineCapability } from '../_shared/capabilityTypes';

export const change_managementCapability = defineCapability({
  id: 'change_management',
  displayName: '공정/사양 4M 변경관리 (ECN/ECO)',
  dependencies: [],
  configurable: true,
  defaultEnabled: true,
  requiredPermissions: ['change_orders:read', 'change_orders:write'],
});

export const changeManagementCapability = change_managementCapability;
