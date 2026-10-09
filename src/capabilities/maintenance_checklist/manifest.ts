import { defineCapability } from '../_shared/capabilityTypes';

export const maintenance_checklistCapability = defineCapability({
  id: 'maintenance_checklist',
  displayName: '시설점검·루틴',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
