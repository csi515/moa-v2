import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

export const retailModuleLabels: ModuleLabels = {
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
    section: '직원',
    management: '직원 관리',
    singular: '직원',
    plural: '직원',
  },
  service: {
    section: '상품',
    management: '상품 관리',
    singular: '상품',
    plural: '상품',
  },
  schedule: {
    section: '판매',
    management: '판매',
    singular: '판매',
    plural: '판매',
  },
};
