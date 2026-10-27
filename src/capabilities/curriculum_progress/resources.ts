import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const curriculumProgressResources: CapabilityResourceDefinition = {
  capabilityId: 'curriculum_progress',
  resources: [
    {
      name: 'curriculum_levels',
      list: '/curriculum',
      create: '/curriculum/new',
      show: '/curriculum/:id',
      edit: '/curriculum/:id/edit',
      meta: {
        label: '학습 진도·성장 리포트',
        icon: 'GraduationCap',
        order: 170,
      },
    },
  ],
};
