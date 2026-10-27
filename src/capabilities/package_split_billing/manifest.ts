import { defineCapability } from '../_shared/capabilityTypes';

export const package_split_billingCapability = defineCapability({
  id: 'package_split_billing',
  displayName: '복합패키지·선수금',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['package:read', 'package:write'],
});
