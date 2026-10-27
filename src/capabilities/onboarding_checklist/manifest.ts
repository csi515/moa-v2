import { defineCapability } from '../_shared/capabilityTypes';

export const onboarding_checklistCapability = defineCapability({
  id: 'onboarding_checklist',
  displayName: '신규 강사·직원 입문 교육 및 수습 평가 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
