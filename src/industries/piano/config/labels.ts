import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

/** Piano Academy 기본 라벨 (학생/선생님/학부모) */
export const pianoModuleLabels: ModuleLabels = {
  customer: {
    singular: '학생',
    plural: '학생',
    management: '학생 관리',
    section: '학생',
    add: '학생 등록',
    search: '학생 검색',
  },
  contact: {
    singular: '학부모',
    plural: '학부모',
    management: '학부모 관리',
  },
  staff: {
    singular: '선생님',
    plural: '선생님',
    management: '선생님 관리',
  },
  service: {
    singular: '반',
    plural: '반',
    management: '반 관리',
  },
  schedule: {
    singular: '일정',
    plural: '일정',
    management: '주간 시간표',
  },
};
