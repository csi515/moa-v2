import type { CapabilityResourceDefinition } from '@/core/presets/types';

export const electronicLabNotebookResources: CapabilityResourceDefinition = {
  capabilityId: 'electronic_lab_notebook',
  resources: [
    {
      name: 'electronic_lab_notebooks',
      list: '/electronic-lab-notebooks',
      show: '/electronic-lab-notebooks/:id',
      create: '/electronic-lab-notebooks/create',
      edit: '/electronic-lab-notebooks/edit/:id',
      meta: {
        label: '전자 연구노트 (ELN)',
        icon: 'BookOpen',
        order: 199,
      },
    },
    {
      name: 'lab_notebook_signatures',
      list: '/lab-notebook-signatures',
      meta: {
        label: '목격 서명 대기함',
        icon: 'PenTool',
        order: 200,
      },
    },
  ],
};
