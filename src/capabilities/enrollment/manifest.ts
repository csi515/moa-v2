import { defineCapability } from '../_shared/capabilityTypes';

export const enrollmentCapability = defineCapability({
  id: 'enrollment',
  displayName: '등록',
  dependencies: ['roster'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
