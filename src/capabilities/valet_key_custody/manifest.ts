import { defineCapability } from '../_shared/capabilityTypes';

export const valet_key_custodyCapability = defineCapability({
  id: 'valet_key_custody',
  displayName: '차량 키 및 발렛 입출차 보관 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
