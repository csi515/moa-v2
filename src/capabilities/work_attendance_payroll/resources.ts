import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const workAttendancePayrollResources: CapabilityResourceDefinition = {
  capabilityId: 'work_attendance_payroll',
  resources: [
    {
      name: 'work_attendance_payroll',
      list: '/work-payroll',
      create: '/work-payroll/new',
      show: '/work-payroll/:id',
      edit: '/work-payroll/:id/edit',
      meta: {
        label: '직원근태·급여명세',
        icon: 'Clock',
        order: 390,
      },
    },
  ],
};
