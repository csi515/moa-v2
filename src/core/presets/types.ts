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

// ============================================================================
// Domain Capability Pack Configurations (수평적 미세 플래그 수렴을 위한 도메인 팩)
// ============================================================================

export interface PresetLabels {
  place: string;
  customer: string;
  owner: string;
  fee: string;
  level: string;
}

/**
 * 1. 공간·시설 도메인 기능 팩 (Facility Capability Pack)
 * 공간/실(roomConfig), 연습실 예약, 사물함/락커 등 물리 자원 관리 설정
 */
export interface FacilityCapabilityConfig {
  enabled: boolean;
  roomConfig?: import('@/core/industry/pluginTypes').IndustryRoomConfig;
  features?: {
    practiceRoomBooking?: boolean;
    lockers?: boolean;
    seatAssignment?: boolean;
  };
}

/**
 * 2. 수납·정산·재무 도메인 기능 팩 (Billing Capability Pack)
 * 수강료/이용료, 정산 계정 과목, 교재/상품 판매 링크, 재무 요약 표시 메타데이터
 */
export interface BillingCapabilityConfig {
  enabled: boolean;
  feeLabel?: string;
  bankAccountPlaceholder?: string;
  supportsDeposit?: boolean;
  payrollExpenseCategory?: string;
  showsTextbooksLink?: boolean;
  displayLinkedIncomeOverview?: boolean;
  getExpenseCategories?: () => readonly import('@/core/industry/pluginTypes').IndustryExpenseCategory[];
  financeHubNav?: import('@/core/industry/pluginTypes').IndustryFinanceHubNav;
}

/**
 * 3. 출결·체크인 도메인 기능 팩 (Attendance Capability Pack)
 * 수업/출입 명사, 반 기반 일정 여부, 회차권 차감 정책, 키오스크 테마 및 부가 동기화
 */
export interface AttendanceCapabilityConfig {
  enabled: boolean;
  recordNoun?: '등하원' | '출입' | '출결';
  usesClassBasedSchedule?: boolean;
  passDeductionMode?: 'atomic_rpc' | 'none';
  summaryMetricColor?: 'rose' | 'teal' | 'amber' | 'indigo';
  runKioskSideEffects?: boolean;
  attendanceCopy?: import('@/core/industry/pluginTypes').IndustryAttendanceCopy;
}

/**
 * 4. 고객·학부모 포털 슬롯 및 정책 도메인 기능 팩 (Portal Capability Pack)
 * 포털 명칭, 1차/2차 네비게이션 탭, 포털 전용 기능 플래그 및 커스텀 뷰 슬롯 주입 계약
 */
export interface PortalCapabilityConfig {
  enabled: boolean;
  portalRoleLabel?: string;
  primaryTabs?: readonly string[];
  secondaryTabs?: readonly string[];
  features?: {
    showsMakeupList?: boolean;
    showsCustomerPoints?: boolean;
    showsPracticeRoomTab?: boolean;
    showsPerformanceVideos?: boolean;
    showsSongStamps?: boolean;
    publicLandingAdultFirst?: boolean;
  };
  customViewSlots?: Record<string, unknown>;
}

/**
 * 5. 예약·상담 도메인 기능 팩 (Booking Capability Pack)
 * 1:1 예약, 진료/상담 시간표, 예약금 및 업종별 예약 어댑터
 */
export interface BookingCapabilityConfig {
  enabled: boolean;
  isAppointment?: boolean;
  supportsDeposit?: boolean;
  bookingAdapter?: import('@/core/industry/bookingIndustryAdapter').BookingIndustryAdapter;
}

/**
 * Core Preset 통합 계약 (CorePluginContract / PresetManifest)
 * Core-Capability-Preset 3계층 아키텍처에서 Preset이 선언하는 표준 매니페스트
 */
export interface PresetManifest {
  readonly id: string;
  readonly name: string;
  readonly labels: PresetLabels;
  readonly theme?: {
    primaryColor?: string;
    accentColor?: string;
  };
  readonly capabilities: {
    facility?: FacilityCapabilityConfig;
    billing?: BillingCapabilityConfig;
    attendance?: AttendanceCapabilityConfig;
    portal?: PortalCapabilityConfig;
    booking?: BookingCapabilityConfig;
  };
  readonly metadata?: Record<string, unknown>;
}
