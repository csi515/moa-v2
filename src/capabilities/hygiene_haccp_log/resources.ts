import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const hygieneHaccpLogResources: CapabilityResourceDefinition = {
  capabilityId: 'hygiene_haccp_log',
  resources: [
    {
      name: 'hygiene_haccp_log',
      list: '/hygiene-log',
      create: '/hygiene-log/new',
      show: '/hygiene-log/:id',
      edit: '/hygiene-log/:id/edit',
      meta: {
        label: '주방위생·보건증',
        icon: 'ShieldCheck',
        order: 360,
      },
    },
  ],
};
