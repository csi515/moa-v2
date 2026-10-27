import { defineCapability } from '../_shared/capabilityTypes';

export const ledger_simpleCapability = defineCapability({
  id: 'ledger_simple',
  displayName: '간이장부·시재마감',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
