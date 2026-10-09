import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const consultationCrmResources: CapabilityResourceDefinition = {
  capabilityId: 'consultation_crm',
  resources: [
    {
      name: 'consultations',
      list: '/consultations',
      create: '/consultations/new',
      show: '/consultations/:id',
      edit: '/consultations/:id/edit',
      meta: {
        label: '상담 일지·고객CRM',
        icon: 'MessageSquareText',
        order: 150,
      },
    },
  ],
};
