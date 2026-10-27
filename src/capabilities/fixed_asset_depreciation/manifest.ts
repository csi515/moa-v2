import { defineCapability } from '../_shared/capabilityTypes';

export const fixed_asset_depreciationCapability = defineCapability({
  id: 'fixed_asset_depreciation',
  displayName: '고정자산 감가상각 & 바코드 실사 대장',
  dependencies: [],
  configurable: true,
  defaultEnabled: false,
  requiredPermissions: [],
});
