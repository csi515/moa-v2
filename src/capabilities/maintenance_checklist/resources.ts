import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const maintenanceChecklistResources: CapabilityResourceDefinition = {
  capabilityId: 'maintenance_checklist',
  resources: [
    {
      name: 'maintenance_checklists',
      list: '/maintenance',
      create: '/maintenance/new',
      edit: '/maintenance/:id/edit',
      meta: {
        label: '시설 점검 루틴',
        icon: 'ClipboardCheck',
        order: 80,
      },
    },
  ],
};
