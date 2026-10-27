import { defineCapability } from '../_shared/capabilityTypes';

export const exam_grade_analyticsCapability = defineCapability({
  id: 'exam_grade_analytics',
  displayName: '단원평가·성적분석',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['grade:read', 'grade:write'],
});
