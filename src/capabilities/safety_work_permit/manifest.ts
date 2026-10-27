import { defineCapability } from '../_shared/capabilityTypes';

export const safety_work_permitCapability = defineCapability({
  id: 'safety_work_permit',
  displayName: '안전작업허가서(PTW) 및 위험작업 승인 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});

export const safetyWorkPermitCapability = safety_work_permitCapability;
