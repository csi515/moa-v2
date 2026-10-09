import { defineCapability } from '../_shared/capabilityTypes';

export const consultation_crmCapability = defineCapability({
  id: 'consultation_crm',
  displayName: '상담일지·고객CRM',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
