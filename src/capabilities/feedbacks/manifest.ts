import { defineCapability } from '../_shared/capabilityTypes';

export const feedbacksCapability = defineCapability({
  id: 'feedbacks',
  displayName: '현장 소통 및 인수인계',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
