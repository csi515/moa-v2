import type { ModuleLabels } from '@/core/labels/types';

export type { ModuleLabels };

/** Piano Academy 기본 라벨 (학생/선생님/학부모 - 쉬운 현장 우리말 용어) */
export const pianoModuleLabels: ModuleLabels = {
  customer: {
    singular: '학생',
    plural: '학생',
    management: '원생 명부',
    section: '학생',
    add: '신규 원생 등록',
    search: '원생 검색',
  },
  contact: {
    singular: '학부모',
    plural: '학부모',
    management: '학부모 연락망',
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
    singular: '수업 시간표',
    plural: '수업 시간표',
    management: '수업 시간표 배정',
  },
  billing: {
    fee: '수강료',
    unpaid: '미납 수강료',
    pass: '회차권·수강권',
    payment: '수강료 수납',
  },
  facility: {
    place: '학원',
    owner: '원장',
    room: '피아노 연습실',
  },
};
