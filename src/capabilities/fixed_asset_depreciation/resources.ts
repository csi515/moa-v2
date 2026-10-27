import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const fixedAssetDepreciationResources: CapabilityResourceDefinition = {
  capabilityId: 'fixed_asset_depreciation',
  resources: [
    {
      name: 'fixed_assets',
      list: '/fixed-assets',
      meta: {
        label: '고정자산 감가상각 대장',
        icon: 'Box',
        order: 161,
      },
    },
  ],
};
