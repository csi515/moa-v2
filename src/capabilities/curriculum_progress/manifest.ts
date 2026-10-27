import { defineCapability } from '../_shared/capabilityTypes';

export const curriculum_progressCapability = defineCapability({
  id: 'curriculum_progress',
  displayName: '학습진도·성장리포트',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
