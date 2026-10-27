import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const level_assessmentResources: CapabilityResourceDefinition = {
  capabilityId: 'level_assessment',
  resources: [
    {
      name: 'level_assessments',
      list: '/level-assessment',
      show: '/level-assessment/:id',
      create: '/level-assessment/create',
      edit: '/level-assessment/edit/:id',
      meta: {
        label: '승급 심사·합격증',
        icon: 'Award',
        order: 185,
      },
    },
  ],
};
