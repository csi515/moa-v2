import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const learning_journalResources: CapabilityResourceDefinition = {
  capabilityId: 'learning_journal',
  resources: [
    {
      name: 'learning_journals',
      list: '/learning-journal',
      show: '/learning-journal/:id',
      create: '/learning-journal/create',
      edit: '/learning-journal/edit/:id',
      meta: {
        label: '수업 일지·알림장',
        icon: 'BookOpen',
        order: 184,
      },
    },
  ],
};
