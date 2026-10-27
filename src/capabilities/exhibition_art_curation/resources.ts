import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const exhibitionArtCurationResources: CapabilityResourceDefinition = {
  capabilityId: 'exhibition_art_curation',
  resources: [
    {
      name: 'art_exhibitions',
      list: '/art-exhibitions',
      meta: {
        label: '원내 예술품 전시 대장',
        icon: 'Palette',
        order: 156,
      },
    },
  ],
};
