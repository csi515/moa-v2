import { defineCapability } from '../_shared/capabilityTypes';

export const trial_funnelCapability = defineCapability({
  id: 'trial_funnel',
  displayName: '체험 및 상담 파이프라인',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
