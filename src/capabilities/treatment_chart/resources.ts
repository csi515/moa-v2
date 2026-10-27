import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const treatmentChartResources: CapabilityResourceDefinition = {
  capabilityId: 'treatment_chart',
  resources: [
    {
      name: 'treatment_charts',
      list: '/charts',
      create: '/charts/new',
      show: '/charts/:id',
      edit: '/charts/:id/edit',
      meta: {
        label: '시술·케어 차트',
        icon: 'Sparkles',
        order: 160,
      },
    },
  ],
};
