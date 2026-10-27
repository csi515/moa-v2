import { defineCapability } from '../_shared/capabilityTypes';

export const level_assessmentCapability = defineCapability({
  id: 'level_assessment',
  displayName: '정기 승급 심사 및 모바일 합격증',
  dependencies: ['roster'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
