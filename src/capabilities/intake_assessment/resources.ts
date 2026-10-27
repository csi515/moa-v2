import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const intake_assessmentResources: CapabilityResourceDefinition = {
  capabilityId: 'intake_assessment',
  resources: [
    {
      name: 'intake_submissions',
      list: '/intake-assessment/submissions',
      show: '/intake-assessment/submissions/:id',
      meta: {
        label: '문진표 제출 내역',
        order: 195,
      },
    },
    {
      name: 'intake_templates',
      list: '/intake-assessment/templates',
      meta: {
        label: '문진표 양식 설정',
        order: 196,
      },
    },
  ],
};

export const intakeAssessmentResources = intake_assessmentResources;
