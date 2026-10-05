/**
 * Universal Terminology Engine types.
 *
 * 다양한 업종(교육, 피트니스, 뷰티, 웰니스, 보육, 리테일 등)의 비즈니스 도메인 용어를
 * 통합 관리하고 계층적 dot-notation 탐색(t('customer.singular'))을 지원합니다.
 *
 * 아키텍처 규칙:
 * - @/types barrel을 import하지 않습니다.
 * - core 계층에 위치하므로 capability/industry 모듈을 import하지 않습니다.
 */

export interface TerminologyCustomerLabels {
  singular: string;
  plural: string;
  management: string;
  section: string;
  add: string;
  search: string;
  statusActive?: string;
  statusWithdrawn?: string;
}

export interface TerminologyContactLabels {
  singular: string;
  plural: string;
  management: string;
}

export interface TerminologyStaffLabels {
  singular: string;
  plural: string;
  management: string;
  section?: string;
}

export interface TerminologyServiceLabels {
  singular: string;
  plural: string;
  management: string;
  section?: string;
}

export interface TerminologyScheduleLabels {
  singular: string;
  plural: string;
  management: string;
  section?: string;
}

export interface TerminologyBillingLabels {
  fee: string;
  unpaid: string;
  pass: string;
  payment: string;
}

export interface TerminologyFacilityLabels {
  place: string;
  owner: string;
  room: string;
}

/** 업종별 전체 용어 사전 */
export interface TerminologyDictionary {
  customer: TerminologyCustomerLabels;
  contact: TerminologyContactLabels;
  staff: TerminologyStaffLabels;
  service: TerminologyServiceLabels;
  schedule: TerminologyScheduleLabels;
  billing: TerminologyBillingLabels;
  facility: TerminologyFacilityLabels;
}

export type KnownTermKey =
  | 'customer.singular'
  | 'customer.plural'
  | 'customer.management'
  | 'customer.section'
  | 'customer.add'
  | 'customer.search'
  | 'customer.statusActive'
  | 'customer.statusWithdrawn'
  | 'contact.singular'
  | 'contact.plural'
  | 'contact.management'
  | 'staff.singular'
  | 'staff.plural'
  | 'staff.management'
  | 'staff.section'
  | 'service.singular'
  | 'service.plural'
  | 'service.management'
  | 'service.section'
  | 'schedule.singular'
  | 'schedule.plural'
  | 'schedule.management'
  | 'schedule.section'
  | 'billing.fee'
  | 'billing.unpaid'
  | 'billing.pass'
  | 'billing.payment'
  | 'facility.place'
  | 'facility.owner'
  | 'facility.room';

/** IDE 자동완성을 보존하면서 확장을 허용하는 개방형 유니온 */
export type TermKey = KnownTermKey | (string & {});
