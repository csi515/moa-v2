import { defineCapability } from '../_shared/capabilityTypes';

export const work_attendance_payrollCapability = defineCapability({
  id: 'work_attendance_payroll',
  displayName: '직원근태·급여명세',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
