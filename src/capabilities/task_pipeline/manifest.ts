import { defineCapability } from '../_shared/capabilityTypes';

export const task_pipelineCapability = defineCapability({
  id: 'task_pipeline',
  displayName: '작업공정·수리파이프라인',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
