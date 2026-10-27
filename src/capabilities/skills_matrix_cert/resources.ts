import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const skillsMatrixCertResources: CapabilityResourceDefinition = {
  capabilityId: 'skills_matrix_cert',
  resources: [
    {
      name: 'staff_skills_matrix',
      list: '/skills-matrix',
      meta: {
        label: '직원 자격증·스킬 매트릭스',
        icon: 'GraduationCap',
        order: 147,
      },
    },
  ],
};
