import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const qualityInspectionResources: CapabilityResourceDefinition = {
  capabilityId: 'quality_inspection',
  resources: [
    {
      name: 'quality_inspection_standards',
      list: '/operations/quality-inspections/standards',
      meta: {
        label: '품질 검사 규격 관리',
        icon: 'ShieldCheck',
        order: 197,
      },
    },
    {
      name: 'quality_inspection_records',
      list: '/operations/quality-inspections',
      meta: {
        label: '품질 검사 결과 대장',
        icon: 'ClipboardCheck',
        order: 198,
      },
    },
  ],
};
