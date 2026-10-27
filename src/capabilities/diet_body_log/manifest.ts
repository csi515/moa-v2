import { defineCapability } from '../_shared/capabilityTypes';

export const diet_body_logCapability = defineCapability({
  id: 'diet_body_log',
  displayName: '식단·체성분다이어리',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
