import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const examGradeAnalyticsResources: CapabilityResourceDefinition = {
  capabilityId: 'exam_grade_analytics',
  resources: [
    {
      name: 'exam_grade_analytics',
      list: '/grade-analytics',
      create: '/grade-analytics/new',
      show: '/grade-analytics/:id',
      edit: '/grade-analytics/:id/edit',
      meta: {
        label: '단원평가·성적분석',
        icon: 'Award',
        order: 330,
      },
    },
  ],
};
