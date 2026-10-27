import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const makeup_lesson_passResources: CapabilityResourceDefinition = {
  capabilityId: 'makeup_lesson_pass',
  resources: [
    {
      name: 'makeup_tokens',
      list: '/makeup-lesson-pass/tokens',
      show: '/makeup-lesson-pass/tokens/:id',
      meta: {
        label: '보강권 발급 현황',
        order: 190,
      },
    },
    {
      name: 'makeup_slots',
      list: '/makeup-lesson-pass/slots',
      meta: {
        label: '보강 오픈 슬롯',
        order: 191,
      },
    },
  ],
};

export const makeupLessonPassResources = makeup_lesson_passResources;
