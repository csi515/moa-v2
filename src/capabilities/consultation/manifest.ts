import { defineCapability } from '../_shared/capabilityTypes';

export const consultationCapability = defineCapability({
  id: 'consultation',
  displayName: '상담',
  dependencies: ['roster'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
