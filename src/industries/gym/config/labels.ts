import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

/** 체육관 UI 라벨 */
export const gymModuleLabels: ModuleLabels = {
  customer: {
    singular: '회원',
    plural: '회원',
    management: '회원 관리',
    section: '회원 및 보호자',
    add: '회원 등록',
    search: '회원 검색',
  },
  contact: {
    singular: '보호자',
    plural: '보호자',
    management: '보호자 관리',
  },
  staff: {
    singular: '강사',
    plural: '강사',
    management: '강사 관리',
    section: '지도진',
  },
  service: {
    singular: '수업반',
    plural: '수업반',
    management: '수업반 관리',
    section: '수업 및 출결',
  },
  schedule: {
    singular: '시간표',
    plural: '시간표',
    management: '주간 시간표',
    section: '수업 일정',
  },
};
