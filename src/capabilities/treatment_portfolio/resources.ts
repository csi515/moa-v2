import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const treatmentPortfolioResources: CapabilityResourceDefinition = {
  capabilityId: 'treatment_portfolio',
  resources: [
    {
      name: 'treatment_portfolio',
      list: '/portfolio',
      create: '/portfolio/new',
      show: '/portfolio/:id',
      edit: '/portfolio/:id/edit',
      meta: {
        label: '스타일북·갤러리',
        icon: 'Sparkles',
        order: 270,
      },
    },
  ],
};
