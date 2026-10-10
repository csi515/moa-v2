import type React from 'react';

export type RosterFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'select'
  | 'boolean'
  | 'phone'
  | 'address'
  | 'textarea';

export type RosterFieldGroup = 'basic' | 'service' | 'billing' | 'pickup' | 'custom';

export interface RosterFieldOption {
  value: string | number;
  label: string;
  hint?: string;
}

export interface RosterFieldDefinition<T = any> {
  id: string;
  name: keyof T | string;
  label: string;
  type: RosterFieldType;
  required?: boolean;
  placeholder?: string;
  options?: readonly (string | RosterFieldOption)[];
  defaultValue?: any;
  group: RosterFieldGroup;
  visible?: (data: T) => boolean;
  helpText?: string;
}

export interface RosterPresentationPolicy {
  entityLabel: string;          // 원생 | 회원 | 원아 | 고객
  staffLabel: string;           // 강사 | 관리사 | 코치 | 선생님
  serviceLabel: string;         // 수업 | 세션 | 레슨 | 코스
  feeLabel: string;             // 수강료 | 회비 | 관리비 | 보육료
  exitActionLabel: string;      // 퇴원 | 종료 | 계약만료
  statusLabels: {
    active: string;             // 재원 | 이용중 | 활성
    paused: string;             // 휴원 | 일시정지 | 휴회
    withdrawn: string;          // 퇴원 | 종료
  };
}

export interface UnifiedRosterConfig<T = any> {
  fields: RosterFieldDefinition<T>[];
  presentation: RosterPresentationPolicy;
  showSchoolFields: boolean;
  showPickupFields: boolean;
  detailTabs?: Array<{
    id: string;
    label: string;
    component: React.ComponentType<{ studentId: string; student: T }>;
  }>;
}
