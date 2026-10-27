import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const mentorMenteeMatchResources: CapabilityResourceDefinition = {
  capabilityId: 'mentor_mentee_match',
  resources: [
    {
      name: 'mentoring_pairs',
      list: '/mentoring-pairs',
      meta: {
        label: '선후배 멘토링 매칭 대장',
        icon: 'UserCheck',
        order: 159,
      },
    },
  ],
};
