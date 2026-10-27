import { defineCapability } from '../_shared/capabilityTypes';

export const study_group_study_hallCapability = defineCapability({
  id: 'study_group_study_hall',
  displayName: '자율 스터디 그룹 결성 및 출석 보증금 정산',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
