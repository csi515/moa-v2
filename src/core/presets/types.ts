/**
 * Multi-vertical Preset & Capability Dynamic Assembly Types
 *
 * 3계층 엄격 분리 원칙:
 * Core - Capability - Industry Preset
 *
 * 각 Capability가 온보딩에 필요한 설정 스키마(setupSchema)와
 * 프레임워크 리소스(resources)를 독립 소유하고, 프리셋 엔진이 이를 조합한다.
 */

export type PresetCapabilityId =
  // 기존 5대 기능
  | 'attendance'
  | 'passes'
  | 'locker'
  | 'booking'
  | 'inventory'
  // 범주 A: 공간·시설 점유 및 자원 순환
  | 'seat_room'
  | 'rental_equipment'
  | 'maintenance_checklist'
  // 범주 B: 인력 배정 및 작업 공정
  | 'instructor_match'
  | 'shift_schedule'
  | 'task_pipeline'
  // 범주 C: 정기 청구 및 무과금 원장
  | 'billing_invoicing'
  | 'ledger_simple'
  | 'credit_wallet'
  // 범주 D: 고객 맞춤 이력 & 신뢰 관리
  | 'consultation_crm'
  | 'treatment_chart'
  | 'safety_consent';

export type SetupFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'time'
  | 'tags'
  | 'textarea';

export interface SetupFieldOption {
  label: string;
  value: string | number;
}

export interface SetupFieldDefinition {
  id: string;
  label: string;
  type: SetupFieldType;
  defaultValue: unknown;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options?: SetupFieldOption[];
}

export interface CapabilitySetupSchema {
  capabilityId: PresetCapabilityId;
  title: string;
  description: string;
  fields: SetupFieldDefinition[];
}

export interface CapabilityResourceItem {
  name: string;
  list?: string;
  create?: string;
  edit?: string;
  show?: string;
  meta: {
    label: string;
    icon?: string;
    order?: number;
    parent?: string;
  };
}

export interface CapabilityResourceDefinition {
  capabilityId: PresetCapabilityId;
  resources: CapabilityResourceItem[];
}

export type PresetReadinessLevel =
  | 'configured' // 1. 구성만 등록됨
  | 'basic_ui' // 2. 기본 화면 제공
  | 'workflow' // 3. 주요 업무 흐름 구현
  | 'persisted' // 4. 데이터 저장과 조회 구현
  | 'isolated' // 5. 권한 및 테넌트 격리 검증
  | 'verified'; // 6. 핵심 회귀 테스트 통과

export interface PresetRoleTemplate {
  name: string;
  rank_order: number;
  permissions: string[];
  description?: string;
}

export interface PresetResourceTemplate {
  name: string;
  type: 'room' | 'seat' | 'equipment' | 'locker' | 'bay' | 'vehicle' | 'court' | 'table';
  capacity?: number;
}

export interface IndustryPresetDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: readonly PresetCapabilityId[];
  requiredCapabilities?: readonly PresetCapabilityId[];
  optionalCapabilities?: readonly PresetCapabilityId[];
  defaultSettings?: Record<string, unknown>;
  businessRules?: Record<string, string | number | boolean>;
  resourceTypes?: readonly PresetResourceTemplate[];
  roles?: readonly PresetRoleTemplate[];
  onboardingSteps?: readonly string[];
  readinessLevel?: PresetReadinessLevel;
}

export interface AssembledPresetResult {
  preset: IndustryPresetDefinition;
  capabilities: readonly PresetCapabilityId[];
  setupSchemas: CapabilitySetupSchema[];
  resources: CapabilityResourceItem[];
  allFields: SetupFieldDefinition[];
}

export interface CapabilityModuleBundle {
  capabilityId: PresetCapabilityId;
  setupSchema: CapabilitySetupSchema;
  resources: CapabilityResourceDefinition;
}
