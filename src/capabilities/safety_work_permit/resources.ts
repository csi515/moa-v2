import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const safetyWorkPermitResources: CapabilityResourceDefinition = {
  capabilityId: 'safety_work_permit',
  resources: [
    {
      name: 'safety_work_permits',
      list: '/safety-work-permits',
      show: '/safety-work-permits/:id',
      create: '/safety-work-permits/create',
      edit: '/safety-work-permits/edit/:id',
      meta: {
        label: '안전작업허가서(PTW)',
        icon: 'ShieldCheck',
        order: 200,
      },
    },
  ],
};
