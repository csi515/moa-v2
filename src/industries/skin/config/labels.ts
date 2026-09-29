import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

export const skinModuleLabels: ModuleLabels = {
  customer: {
    section: '고객',
    management: '고객 관리',
    singular: '고객',
    plural: '고객',
    add: '고객 등록',
    search: '고객 검색',
  },
  contact: {
    singular: '연락처',
    plural: '연락처',
    management: '연락처 관리',
  },
  staff: {
    section: '관리사',
    management: '관리사 관리',
    singular: '관리사',
    plural: '관리사',
  },
  service: {
    section: '시술',
    management: '시술',
    singular: '시술',
    plural: '시술',
  },
  schedule: {
    section: '예약',
    management: '예약 캘린더',
    singular: '예약',
    plural: '예약',
  },
};
