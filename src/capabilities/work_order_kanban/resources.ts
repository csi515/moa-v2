import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const workOrderKanbanResources: CapabilityResourceDefinition = {
  capabilityId: 'work_order_kanban',
  resources: [
    {
      name: 'work_orders',
      list: '/work-orders',
      create: '/work-orders/new',
      show: '/work-orders/:id',
      edit: '/work-orders/:id/edit',
      meta: {
        label: '작업지시·공임',
        icon: 'Wrench',
        order: 280,
      },
    },
  ],
};
