import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

export const pilatesModuleLabels: ModuleLabels = {
  customer: {
    section: '회원',
    management: '회원 관리',
    singular: '회원',
    plural: '회원',
    add: '회원 등록',
    search: '회원 검색',
  },
  contact: {
    singular: '보호자',
    plural: '보호자',
    management: '보호자 관리',
  },
  staff: {
    section: '강사',
    management: '강사 관리',
    singular: '강사',
    plural: '강사',
  },
  service: {
    section: '수업',
    management: '수업 종류',
    singular: '수업',
    plural: '수업',
  },
  schedule: {
    section: '예약',
    management: '예약 캘린더',
    singular: '예약',
    plural: '예약',
  },
};
