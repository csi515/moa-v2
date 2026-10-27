import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

/** 사우나·찜질방 UI 라벨 */
export const bathModuleLabels: ModuleLabels = {
  customer: {
    singular: '고객',
    plural: '고객',
    management: '고객 관리',
    section: '고객',
    add: '고객 등록',
    search: '고객 검색',
  },
  contact: {
    singular: '연락처',
    plural: '연락처',
    management: '연락처 관리',
  },
  staff: {
    singular: '직원',
    plural: '직원',
    management: '직원 관리',
    section: '근무 인력',
  },
  service: {
    singular: '시설',
    plural: '시설',
    management: '시설 관리',
    section: '시설',
  },
  schedule: {
    singular: '일정',
    plural: '일정',
    management: '일정',
    section: '운영 일정',
  },
};
