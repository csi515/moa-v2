import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const franchiseSupervisionResources: CapabilityResourceDefinition = {
  capabilityId: 'franchise_supervision',
  resources: [
    {
      name: 'supervision_audits',
      list: '/supervision-audits',
      meta: {
        label: 'QSC 슈퍼바이징 점검',
        icon: 'ClipboardCheck',
        order: 138,
      },
    },
  ],
};
