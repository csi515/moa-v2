import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const changeManagementResources: CapabilityResourceDefinition = {
  capabilityId: 'change_management',
  resources: [
    {
      name: 'change_orders',
      list: '/operations/change-management',
      meta: {
        label: '4M 변경관리(ECN)',
        icon: 'GitPullRequest',
        order: 199,
      },
    },
    {
      name: 'change_order_evaluations',
      list: '/operations/change-management/evaluations',
      meta: {
        label: '변경 영향도 평가 대장',
        icon: 'Scale',
        order: 200,
      },
    },
  ],
};
