import { defineCapability } from '../_shared/capabilityTypes';

export const instructor_matchCapability = defineCapability({
  id: 'instructor_match',
  displayName: '강사·담당자 배정',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
