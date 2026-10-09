import { defineCapability } from '../_shared/capabilityTypes';

export const safety_consentCapability = defineCapability({
  id: 'safety_consent',
  displayName: '전자동의·안전서약',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
