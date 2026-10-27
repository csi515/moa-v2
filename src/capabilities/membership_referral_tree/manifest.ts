import { defineCapability } from '../_shared/capabilityTypes';

export const membership_referral_treeCapability = defineCapability({
  id: 'membership_referral_tree',
  displayName: '패밀리·형제할인',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: ['family_tree:read', 'family_tree:write'],
});
