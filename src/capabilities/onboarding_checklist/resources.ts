import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const onboardingChecklistResources: CapabilityResourceDefinition = {
  capabilityId: 'onboarding_checklist',
  resources: [
    {
      name: 'staff_onboardings',
      list: '/staff-onboardings',
      meta: {
        label: '신규 직원 온보딩 대장',
        icon: 'UserCheck',
        order: 146,
      },
    },
  ],
};
