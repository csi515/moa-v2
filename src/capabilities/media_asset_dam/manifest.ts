import { defineCapability } from '../_shared/capabilityTypes';

export const media_asset_damCapability = defineCapability({
  id: 'media_asset_dam',
  displayName: '시설 홍보용 미디어 자산 및 초상권 동의 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
