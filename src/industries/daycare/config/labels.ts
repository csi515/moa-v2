import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

/** 어린이집 UI 라벨 */
export const daycareModuleLabels: ModuleLabels = {
  customer: {
    singular: '원아',
    plural: '원아',
    management: '원아 관리',
    section: '원아 및 보호자',
    add: '원아 등록',
    search: '원아 검색',
  },
  contact: {
    singular: '보호자',
    plural: '보호자',
    management: '보호자 관리',
  },
  staff: {
    singular: '교사',
    plural: '교사',
    management: '교사 관리',
    section: '보육 인력',
  },
  service: {
    singular: '반',
    plural: '반',
    management: '반 관리',
    section: '반·출결',
  },
  schedule: {
    singular: '시간표',
    plural: '시간표',
    management: '주간 시간표',
    section: '일과',
  },
};
