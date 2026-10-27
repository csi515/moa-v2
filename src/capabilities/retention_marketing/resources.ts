import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const retentionMarketingResources: CapabilityResourceDefinition = {
  capabilityId: 'retention_marketing',
  resources: [
    {
      name: 'retention_marketing',
      list: '/retention',
      create: '/retention/new',
      show: '/retention/:id',
      edit: '/retention/:id/edit',
      meta: {
        label: '자동 리텐션 마케팅',
        icon: 'Megaphone',
        order: 180,
      },
    },
  ],
};
