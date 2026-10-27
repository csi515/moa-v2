import { defineCapability } from '../_shared/capabilityTypes';

export const intake_assessmentCapability = defineCapability({
  id: 'intake_assessment',
  displayName: '사전 문진표 & 첫 방문 고객 맞춤 진단서',
  dependencies: ['consultation_crm'],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['consultation.manage'],
});

export const intakeAssessmentManifest = intake_assessmentCapability;
