import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const instructorMatchResources: CapabilityResourceDefinition = {
  capabilityId: 'instructor_match',
  resources: [
    {
      name: 'instructors',
      list: '/instructors',
      show: '/instructors/:id',
      meta: {
        label: '강사·담당자 매칭',
        icon: 'UserCheck2',
        order: 90,
      },
    },
  ],
};
