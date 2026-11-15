/**
 * Capability 계약. 구현 이동 없이 타입·매니페스트만 둔다.
 *
 * Core: 업종 독립 공통 기반
 * Capability: 여러 업종이 선택적으로 쓰는 업무 기능
 * Industry: 특정 업종의 조합·전용 기능
 * Composition: 업종과 capability를 조립
 */

export const CAPABILITY_IDS = [
  'attendance',
  'scheduling',
  'booking',
  'billing',
  'commerce',
  'parent',
  'resources',
  'transport',
  'roster',
  'enrollment',
  'consultation',
  'passes',
  'locker',
  'inventory',
  'seat_room',
  'rental_equipment',
  'maintenance_checklist',
  'instructor_match',
  'shift_schedule',
  'task_pipeline',
  'billing_invoicing',
  'ledger_simple',
  'credit_wallet',
  'consultation_crm',
  'treatment_chart',
  'safety_consent',
  'curriculum_progress',
  'retention_marketing',
  'table_order_kds',
  'diet_body_log',
  'vehicle_shuttle',
  'shuttle_dispatch',
  'volunteer_activity',
  'meal_survey',
  'office_supply_request',
  'commission_payroll',
  'lost_found',
  'recipe_bom',
  'digital_contract',
  'seat_timer_billing',
  'treatment_portfolio',
  'work_order_kanban',
  'waitlist_turn_queue',
  'deposit_escrow',
  'equipment_lifecycle',
  'package_split_billing',
  'exam_grade_analytics',
  'kiosk_staff_call',
  'membership_referral_tree',
  'hygiene_haccp_log',
  'sop_risk_assessment',
  'vendor_ap_invoice',
  'work_attendance_payroll',
  'pickup_orders',
  'loyalty_stamp',
  'workplace_policy',
  'feedbacks',
  'trial_funnel',
  'learning_journal',
  'level_assessment',
  'space_turnaround',
  'supply_restock',
  'makeup_lesson_pass',
  'intake_assessment',
  'daily_care_report',
  'substitute_dispatch',
  'entry_pass_ticket',
  'event_contest_hub',
  'facility_incident_report',
  'nps_survey_collector',
  'achievement_quest_badge',
  'parking_validator',
  'emergency_alert_broadcast',
  'digital_guestbook',
  'mbo',
  'approval_workflow',
  'quality_inspection',
  'change_management',
  'patent_ip_asset',
  'leave_management',
  'promotional_deal',
  'research_project',
  // 30개 외부 연동 없는 독립 신규 Capability
  'daily_pos_reconciliation',
  'lost_card_rfid',
  'valet_key_custody',
  'coatroom_baggage',
  'locker_emergency_override',
  'sound_broadcast_schedule',
  'certificate_issuance',
  'customer_blacklist_guard',
  'franchise_supervision',
  'nda_privacy_audit',
  'sublease_space_contract',
  'calibration_metering',
  'key_access_control',
  'hazardous_waste_log',
  'consumable_dispenser',
  'energy_utility_meter',
  'onboarding_checklist',
  'skills_matrix_cert',
  'whistleblower_grievance',
  'uniform_safety_gear',
  'petty_cash_expense',
  'prepaid_tax_withholding',
  'royalty_profit_share',
  'service_warranty_claim',
  'custom_order_craft',
  'media_asset_dam',
  'exhibition_art_curation',
  'vip_concierge_preference',
  'study_group_study_hall',
  'mentor_mentee_match',
  // 전문 ERP 벤치마킹 7대 신규 Capability
  'simple_pl_cashflow',
  'fixed_asset_depreciation',
  'procurement_3way_match',
  'fefo_lot_tracker',
  'budget_ceiling_quota',
  'field_audit_trail',
  'vendor_scorecard',
  'field_dispatch',
  'waitlist_queue',
  'hazardous_substance_msds',
  'electronic_lab_notebook',
  'vehicle_mileage_log',
  'safety_work_permit',
  'baby_food_coop',
] as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export interface CapabilityDefinition {
  id: CapabilityId;
  displayName: string;
  dependencies: CapabilityId[];
  configurable: boolean;
  defaultEnabled: boolean;
  requiredPermissions: string[];
}

/** 장기 디렉터리 계약. 지금은 선언만 하고 기존 코드를 옮기지 않는다. */
export type CapabilityPackageLayout = {
  manifest: 'manifest.ts';
  domain: 'domain/';
  application: 'application/';
  ui: 'ui/';
  infrastructure: 'infrastructure/';
  barrel: 'index.ts';
};

export interface CapabilityManifest {
  definition: CapabilityDefinition;
}

export function defineCapability(definition: CapabilityDefinition): CapabilityManifest {
  return { definition };
}

export function assertCapabilityDefinition(definition: CapabilityDefinition): void {
  if (!CAPABILITY_IDS.includes(definition.id)) {
    throw new Error(`unknown capability id: ${definition.id}`);
  }
  if (!definition.displayName.trim()) {
    throw new Error(`capability ${definition.id}: displayName required`);
  }
  for (const dep of definition.dependencies) {
    if (!CAPABILITY_IDS.includes(dep)) {
      throw new Error(`capability ${definition.id}: unknown dependency ${dep}`);
    }
    if (dep === definition.id) {
      throw new Error(`capability ${definition.id}: cannot depend on itself`);
    }
  }
}

/**
 * 26대 Capability의 도메인 업무 영역 및 모듈 위계 관계.
 * AGENTS.md 원칙: 중복 구현 방지 및 단일 업무 본질 재사용 규격.
 */
export const CAPABILITY_DOMAIN_RELATIONS = {
  // 재무/결제/원장 도메인
  finance: {
    parent: 'billing',
    children: ['billing_invoicing', 'ledger_simple', 'credit_wallet'],
    description: '청구, 단순 원장, 적립 지갑은 billing 도메인의 특화 하위 기능',
  },
  // 고객 상담 및 신뢰 관리 도메인
  crm: {
    parent: 'consultation',
    children: ['consultation_crm', 'treatment_chart', 'safety_consent'],
    description: '상담 CRM, 시술 차트, 안전 동의서는 consultation 도메인의 특화 하위 기능',
  },
  // 회원 및 고객 명부 도메인 (Roster)
  roster_lifecycle: {
    parent: 'roster',
    children: ['enrollment'],
    description: '수강 등록은 roster 회원 라이프사이클의 진입 단계',
  },
  // 재고 및 커머스 도메인
  commerce_stock: {
    parent: 'commerce',
    children: ['inventory'],
    description: '단순 재고 관리는 commerce/stock 도메인의 하위 모듈',
  },
  // 공간 및 자원 점유 도메인
  spatial_resources: {
    parent: 'resources',
    children: ['seat_room', 'rental_equipment', 'locker', 'maintenance_checklist'],
    description: '좌석, 대여 장비, 라커, 점검표는 공간/자원 관리의 세부 모듈',
  },
  // 일정 및 예약 도메인
  scheduling_booking: {
    parent: 'scheduling',
    children: ['booking', 'shift_schedule'],
    description: '예약 및 교대 근무는 scheduling 도메인의 하위 실행 단위',
  },
} as const;
