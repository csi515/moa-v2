import { defineCapability } from '../_shared/capabilityTypes';

export const franchise_supervisionCapability = defineCapability({
  id: 'franchise_supervision',
  displayName: '가맹 본사 QSC 점검 및 정기 슈퍼바이징',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
