import { defineCapability } from '../_shared/capabilityTypes';

export const work_order_kanbanCapability = defineCapability({
  id: 'work_order_kanban',
  displayName: '작업지시·공임견적',
  dependencies: ['inventory'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
