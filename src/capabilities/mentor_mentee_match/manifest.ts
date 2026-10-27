import { defineCapability } from '../_shared/capabilityTypes';

export const mentor_mentee_matchCapability = defineCapability({
  id: 'mentor_mentee_match',
  displayName: '수강생 선후배 멘토링 매칭 및 활동 평가 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
