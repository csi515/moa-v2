import { defineCapability } from '../_shared/capabilityTypes';

export const quality_inspectionCapability = defineCapability({
  id: 'quality_inspection',
  displayName: '품질 검사 및 규격 판정 (QA/QC)',
  dependencies: [],
  configurable: true,
  defaultEnabled: true,
  requiredPermissions: ['quality:read', 'quality:write'],
});

export const qualityInspectionCapability = quality_inspectionCapability;
