import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const dietBodyLogResources: CapabilityResourceDefinition = {
  capabilityId: 'diet_body_log',
  resources: [
    {
      name: 'diet_body_logs',
      list: '/diet-body-log',
      create: '/diet-body-log/new',
      show: '/diet-body-log/:id',
      edit: '/diet-body-log/:id/edit',
      meta: {
        label: '식단·체성분 다이어리',
        icon: 'Activity',
        order: 200,
      },
    },
  ],
};
