/**
 * Multi-vertical Preset & Capability Dynamic Assembly Types
 *
 * 3계층 엄격 분리 원칙:
 * Core - Capability - Industry Preset
 *
 * 각 Capability가 온보딩에 필요한 설정 스키마(setupSchema)와
 * 프레임워크 리소스(resources)를 독립 소유하고, 프리셋 엔진이 이를 조합한다.
 */

export type BundledPresetCapabilityId =
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
  | 'safety_consent'
  // 범주 E: 맞춤 학습 & 성장 관리
  | 'curriculum_progress'
  // 범주 F: 자동화 CRM & 고객 리텐션
  | 'retention_marketing'
  // 범주 G: 비대면 주문 & 주방 공정 관리
  | 'table_order_kds'
  // 범주 H: 피트니스 체형 & 운동 케어
  | 'diet_body_log'
  // 범주 I: 통학 & 모빌리티 관제
  | 'vehicle_shuttle'
  | 'shuttle_dispatch'
  | 'volunteer_activity'
  | 'meal_survey'
  | 'office_supply_request'
  // 범주 J: 프리랜서 & 인센티브 정산
  | 'commission_payroll'
  // 범주 K: 시설 분실물·습득물 보관
  | 'lost_found'
  // 범주 L: 레시피 BOM & 원가 소모
  | 'recipe_bom'
  // 범주 M: 전자계약 & 환불 위약금
  | 'digital_contract'
  // 범주 N: 시간제 공간 타이머 & 초과과금
  | 'seat_timer_billing'
  // 범주 O: 시술 스타일북 & 업셀링
  | 'treatment_portfolio'
  // 범주 P: 정비 수리 공정 칸반 & 견적
  | 'work_order_kanban'
  // 범주 Q: 현장 순번 대기 & DID 호출
  | 'waitlist_turn_queue'
  // 범주 R: 노쇼 방지 보증금 에스크로
  | 'deposit_escrow'
  // 범주 S: 장비 수명 주기 & 감가상각
  | 'equipment_lifecycle'
  // 범주 T: 복합 패키지 분할 선수금
  | 'package_split_billing'
  // 범주 U: 단원평가 성적 채점 & 취약점 분석
  | 'exam_grade_analytics'
  // 범주 V: 좌석/룸 스마트 호출 & 디지털 벨보드
  | 'kiosk_staff_call'
  // 범주 W: 패밀리 연동 & 추천인 리워드
  | 'membership_referral_tree'
  // 범주 X: 주방 위생 HACCP & 보건증 만료
  | 'hygiene_haccp_log'
  // 범주 Y: 사업장 작업표준 & 위험성평가
  | 'sop_risk_assessment'
  // 범주 Z: 공급처 원장 & 매입 세무 전표
  | 'vendor_ap_invoice'
  // 범주 AA: 직원 근태 & 법정 급여명세서
  | 'work_attendance_payroll'
  // 범주 AB: 사전 예약 픽업 칸반
  | 'pickup_orders'
  // 범주 AC: 모바일 전자 스탬프 / 칭찬 스티커
  | 'loyalty_stamp'
  // 범주 AD: 매장 내규·사규 관리
  | 'workplace_policy'
  // 범주 AE: 현장 소통 및 교대 인수인계
  | 'feedbacks'
  // 범주 AF: 무료 체험 및 상담 리드 전환 파이프라인
  | 'trial_funnel'
  // 범주 AG: 수업 일지 및 학부모 알림장 피드
  | 'learning_journal'
  // 범주 AH: 정기 승급 심사 및 모바일 합격증
  | 'level_assessment'
  // 범주 AI: 공간 턴어라운드 및 정비 버퍼
  | 'space_turnaround'
  // 범주 AJ: 소모품 안전재고 및 간이 발주서
  | 'supply_restock'
  // 범주 AK: 결석 보강 티켓 & 보강 슬롯 매칭
  | 'makeup_lesson_pass'
  // 범주 AL: 사전 문진표 & 맞춤 진단서
  | 'intake_assessment'
  // 범주 AM: 돌봄/활동 일일 알림장 & 타임라인 피드
  | 'daily_care_report'
  // 범주 AN: 강사 대진/대강 긴급 호출
  | 'substitute_dispatch'
  // 범주 AO: 모바일 일일 입장권 & QR 검표
  | 'entry_pass_ticket'
  // 범주 AP: 원내 발표회·대회 큐시트/심사
  | 'event_contest_hub'
  // 범주 AQ: 시설 안전사고·파손 경위서 & 보험 대장
  | 'facility_incident_report'
  // 범주 AR: 모바일 만족도·NPS 설문 조사 및 피드백 분석기
  | 'nps_survey_collector'
  // 범주 AS: 원생 성취 퀘스트 & 0원 W3C SVG 뱃지 수여 엔진
  | 'achievement_quest_badge'
  // 범주 AT: 고객 무료 주차 등록 & 상가 주차권 정산기
  | 'parking_validator'
  // 범주 AU: 긴급 휴원·재난 공지 & 모바일 수신확인 대장
  | 'emergency_alert_broadcast'
  // 범주 AV: 오프라인 내방객 전자 방명록 & 마케팅 동의기
  | 'digital_guestbook'
  // 범주 AW: 목표관리(MBO) 및 실행 프로젝트
  | 'mbo'
  // 범주 AX: 전사 범용 전자결재 및 기안 승인 워크플로
  | 'approval_workflow'
  // 범주 AY: 전문 품질검사 및 규격 공차 판정 대장
  | 'quality_inspection'
  // 범주 AZ: 공정/사양 4M 변경관리(ECN/ECO)
  | 'change_management'
  // 범주 BA: 특허 및 지식재산권(IP) 자산 관리
  | 'patent_ip_asset'
  // 범주 BB: 시간 단위 정밀 휴가 및 유연근무 차감 대장
  | 'leave_management'
  // 범주 BC: 기간 한정 특가 & 이벤트 스케줄러
  | 'promotional_deal'
  // 범주 BD: 연구과제 생명주기 (담당/예산/산출물/게이트)
  | 'research_project'
  // 30개 외부 연동 없는 독립 신규 Capability
  | 'daily_pos_reconciliation'
  | 'lost_card_rfid'
  | 'valet_key_custody'
  | 'coatroom_baggage'
  | 'locker_emergency_override'
  | 'sound_broadcast_schedule'
  | 'certificate_issuance'
  | 'customer_blacklist_guard'
  | 'franchise_supervision'
  | 'nda_privacy_audit'
  | 'sublease_space_contract'
  | 'calibration_metering'
  | 'key_access_control'
  | 'hazardous_waste_log'
  | 'consumable_dispenser'
  | 'energy_utility_meter'
  | 'onboarding_checklist'
  | 'skills_matrix_cert'
  | 'whistleblower_grievance'
  | 'uniform_safety_gear'
  | 'petty_cash_expense'
  | 'prepaid_tax_withholding'
  | 'royalty_profit_share'
  | 'service_warranty_claim'
  | 'custom_order_craft'
  | 'media_asset_dam'
  | 'exhibition_art_curation'
  | 'vip_concierge_preference'
  | 'study_group_study_hall'
  | 'mentor_mentee_match'
  // 전문 ERP 벤치마킹 7대 신규 Capability
  | 'simple_pl_cashflow'
  | 'fixed_asset_depreciation'
  | 'procurement_3way_match'
  | 'fefo_lot_tracker'
  | 'budget_ceiling_quota'
  | 'field_audit_trail'
  | 'vendor_scorecard'
  | 'field_dispatch'
  | 'waitlist_queue'
  | 'hazardous_substance_msds'
  | 'electronic_lab_notebook'
  | 'vehicle_mileage_log'
  | 'safety_work_permit'
  // 향후 지속적인 신규 Capability 추가를 위한 Open Union 확장 (자동완성 유지 + 유연한 확장)
  | (string & {});


export type PresetCapabilityId =
  | BundledPresetCapabilityId
  // 코어/공통 기반 기능 식별자 (Alias 및 코어 매핑용)
  | 'billing'
  | 'consultation'
  | 'commerce'
  | 'scheduling'
  | 'resources'
  | 'roster'
  | 'enrollment'
  | 'parent'
  | 'transport'
  | 'retail_inventory'
  | 'crm_tags'
  | 'billing_invoices';

/**
 * 중복 Capability 단일화 및 하위 호환 Alias 매핑 테이블
 * AGENTS.md 원칙: 같은 본질의 업무는 하나의 Capability 번들을 재사용한다.
 */
export const CAPABILITY_ALIASES: Partial<Record<PresetCapabilityId, BundledPresetCapabilityId>> = {
  billing: 'billing_invoicing',
  consultation: 'consultation_crm',
  commerce: 'inventory',
  scheduling: 'booking',
  resources: 'seat_room',
  enrollment: 'attendance',
  roster: 'attendance',
  parent: 'learning_journal',
  transport: 'vehicle_shuttle',
  time_block_rental: 'seat_timer_billing',
  dormitory_bed: 'seat_room',
  laundry_drycleaning: 'work_order_kanban',
  pet_grooming_hotel: 'booking',
  photo_shoot_project: 'task_pipeline',
  qr_smart_stamp: 'loyalty_stamp',
  retail_inventory: 'inventory',
  crm_tags: 'consultation_crm',
  billing_invoices: 'billing_invoicing',
};

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
  type: 'room' | 'seat' | 'equipment' | 'locker' | 'bay' | 'vehicle' | 'court' | 'table' | 'line';
  capacity?: number;
}

export interface PresetTermsDefinition {
  customer: string;
  instructor?: string;
  space?: string;
  pass?: string;
  fee?: string;
  lesson?: string;
  level?: string;
  tenant?: string;
  owner?: string;
  staff?: string;
  billing?: string;
}

export interface PresetFacilityDefinition {
  needsLocker?: boolean;
  defaultLockerCount?: number;
  needsKiosk?: boolean;
  hasDepartments?: boolean;
  turnaroundBufferMinutes?: number;
}

export interface PresetOperatingHoursDefinition {
  day_type: string;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface PassStarterTemplate {
  name: string;
  passType: 'COUNT_BASED' | 'PERIOD_BASED' | 'HYBRID';
  totalCount: number;
  validityDays: number;
  description?: string;
  recommendedPrice?: number;
  badge?: string;
}

export interface PresetThemeDefinition {
  accentColor: 'indigo' | 'emerald' | 'rose' | 'orange' | 'amber' | 'sky' | 'teal' | 'purple' | 'slate';
  badgeEmoji: string;
  emblem?: string;
}

export interface IndustryPresetDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: readonly PresetCapabilityId[];
  requiredCapabilities?: readonly PresetCapabilityId[];
  optionalCapabilities?: readonly PresetCapabilityId[];
  terms?: PresetTermsDefinition;
  operatingHours?: PresetOperatingHoursDefinition;
  facilities?: PresetFacilityDefinition;
  theme?: PresetThemeDefinition;
  starterPassTemplates?: readonly PassStarterTemplate[];
  defaultSettings?: Record<string, unknown>;
  businessRules?: Record<string, string | number | boolean>;
  resourceTypes?: readonly PresetResourceTemplate[];
  roles?: readonly PresetRoleTemplate[];
  onboardingSteps?: readonly string[];
  readinessLevel?: PresetReadinessLevel;
  hiddenInMoa?: boolean;
}

export interface AssembledPresetResult {
  preset: IndustryPresetDefinition;
  capabilities: readonly PresetCapabilityId[];
  setupSchemas: CapabilitySetupSchema[];
  resources: CapabilityResourceItem[];
  allFields: SetupFieldDefinition[];
  skippedOptionalCapabilities?: readonly PresetCapabilityId[];
}

export interface CapabilityModuleBundle {
  capabilityId: PresetCapabilityId;
  setupSchema: CapabilitySetupSchema;
  resources: CapabilityResourceDefinition;
}

// ============================================================================
// Legacy Plugin Facade Contracts (레거시 업종 플러그인 호환 어댑터 계약)
//
// [아키텍처 원칙]
// Moa-v2의 최종 아키텍처는 Core – Capability – Preset 3계층으로 단일화되며,
// 별도의 Domain Capability 계층은 존재하지 않습니다.
//
// 아래의 *CapabilityConfig 및 PresetManifest 타입은 기존 레거시 업종 모듈(피아노,
// 피부, 헬스 등)과의 하위 호환성을 유지하기 위해 IndustryAdapter에서 사용하는
// 호환용 파사드 계약(Facade Contract)입니다.
// 실제 다업종 프리셋 조립 엔진은 위의 IndustryPresetDefinition 및 17대 원자적
// Capability 번들을 사용합니다.
// ============================================================================

export interface PresetLabels {
  place: string;
  customer: string;
  owner: string;
  fee: string;
  level: string;
}

/**
 * 1. 공간·시설 호환 설정 (Facility Legacy Plugin Config)
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
 * 2. 수납·정산·재무 호환 설정 (Billing Legacy Plugin Config)
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
 * 3. 출결·체크인 호환 설정 (Attendance Legacy Plugin Config)
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
 * 4. 고객·학부모 포털 슬롯 및 정책 호환 설정 (Portal Legacy Plugin Config)
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
 * 5. 예약·상담 호환 설정 (Booking Legacy Plugin Config)
 * 1:1 예약, 진료/상담 시간표, 예약금 및 업종별 예약 어댑터
 */
export interface BookingCapabilityConfig {
  enabled: boolean;
  isAppointment?: boolean;
  supportsDeposit?: boolean;
  bookingAdapter?: import('@/core/industry/bookingIndustryAdapter').BookingIndustryAdapter;
}

/**
 * Legacy Preset Manifest (IndustryAdapter 호환용 매니페스트 계약)
 * 레거시 IndustryAdapter가 기존 플러그인을 파사드로 래핑하여 제공하는 매니페스트
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
