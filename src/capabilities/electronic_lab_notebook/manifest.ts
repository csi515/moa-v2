import { defineCapability } from '../_shared/capabilityTypes';

export const electronic_lab_notebookCapability = defineCapability({
  id: 'electronic_lab_notebook',
  displayName: '전자 연구노트 (ELN)',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
