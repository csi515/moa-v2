import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const studyGroupStudyHallResources: CapabilityResourceDefinition = {
  capabilityId: 'study_group_study_hall',
  resources: [
    {
      name: 'study_groups',
      list: '/study-groups',
      meta: {
        label: '자율 스터디 모임 대장',
        icon: 'Users',
        order: 158,
      },
    },
  ],
};
