import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const leaveManagementResources: CapabilityResourceDefinition = {
  capabilityId: 'leave_management',
  resources: [
    {
      name: 'staff_leave_balances',
      list: '/leave-balances',
      meta: {
        label: '직원 휴가 시간 잔여 대장',
        icon: 'Clock',
        order: 197,
      },
    },
    {
      name: 'staff_leave_requests',
      list: '/leave-requests',
      meta: {
        label: '휴가 신청 및 결재 이력',
        icon: 'Calendar',
        order: 198,
      },
    },
  ],
};
