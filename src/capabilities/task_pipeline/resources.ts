import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const taskPipelineResources: CapabilityResourceDefinition = {
  capabilityId: 'task_pipeline',
  resources: [
    {
      name: 'task_pipelines',
      list: '/pipelines',
      create: '/pipelines/new',
      show: '/pipelines/:id',
      edit: '/pipelines/:id/edit',
      meta: {
        label: '작업 공정 칸반',
        icon: 'KanbanSquare',
        order: 110,
      },
    },
  ],
};
