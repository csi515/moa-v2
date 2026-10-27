import { defineCapability } from '../_shared/capabilityTypes';

export const skills_matrix_certCapability = defineCapability({
  id: 'skills_matrix_cert',
  displayName: '직원 법정 자격증 갱신 및 직무 스킬 매트릭스',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
