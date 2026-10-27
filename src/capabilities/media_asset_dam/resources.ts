import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const mediaAssetDamResources: CapabilityResourceDefinition = {
  capabilityId: 'media_asset_dam',
  resources: [
    {
      name: 'media_assets',
      list: '/media-assets',
      meta: {
        label: '홍보 미디어 자산 대장',
        icon: 'Image',
        order: 155,
      },
    },
  ],
};
