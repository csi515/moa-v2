import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const feedbacksResources: CapabilityResourceDefinition = {
  capabilityId: 'feedbacks',
  resources: [
    {
      name: 'handover_notes',
      list: '/operations/handover',
      meta: {
        label: '교대 인수인계장',
        icon: 'ClipboardCheck',
        order: 180,
      },
    },
    {
      name: 'feedbacks',
      list: '/operations/feedbacks',
      meta: {
        label: '고객 VOC 및 건의',
        icon: 'MessageSquareText',
        order: 181,
      },
    },
    {
      name: 'incident_logs',
      list: '/operations/incidents',
      meta: {
        label: '안전사고 감사 일지',
        icon: 'ShieldAlert',
        order: 182,
      },
    },
  ],
};
