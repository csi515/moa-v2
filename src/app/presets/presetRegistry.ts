/**
 * Multi-vertical Industry Preset Registry & Capability Registry (Composition Layer)
 *
 * 3계층 엄격 분리 원칙:
 * 1. Core: 인증, 테넌트 격리, 확장 인터페이스 (개별 Capability를 모름)
 * 2. Capability: 독립 업무 영역, 업종 중립적 재사용 도메인 로직
 * 3. Preset (Composition): 필요한 Capability와 설정을 조합해 업종별 사업장 프로그램 구성
 *
 * 각 Capability는 독립적으로 setupSchema와 resources를 소유하며,
 * 프리셋 레이어가 이를 선언적으로 묶어 애플리케이션에 제공한다.
 */

import type {
  CapabilityModuleBundle,
  IndustryPresetDefinition,
  PresetCapabilityId,
} from '@/core/presets/types';
import { registerCapabilityBundles } from '@/core/presets/presetAssembler';

// 기존 5대 기능 스키마 & 리소스
import { attendanceSetupSchema } from '@/capabilities/attendance/setupSchema';
import { attendanceResources } from '@/capabilities/attendance/resources';
import { bookingSetupSchema } from '@/capabilities/booking/setupSchema';
import { bookingResources } from '@/capabilities/booking/resources';
import { passesSetupSchema } from '@/capabilities/passes/setupSchema';
import { passesResources } from '@/capabilities/passes/resources';
import { lockerSetupSchema } from '@/capabilities/locker/setupSchema';
import { lockerResources } from '@/capabilities/locker/resources';
import { inventorySetupSchema } from '@/capabilities/inventory/setupSchema';
import { inventoryResources } from '@/capabilities/inventory/resources';

// 신규 12종 Capability 스키마 & 리소스
import { seatRoomSetupSchema } from '@/capabilities/seat_room/setupSchema';
import { seatRoomResources } from '@/capabilities/seat_room/resources';
import { rentalEquipmentSetupSchema } from '@/capabilities/rental_equipment/setupSchema';
import { rentalEquipmentResources } from '@/capabilities/rental_equipment/resources';
import { maintenanceChecklistSetupSchema } from '@/capabilities/maintenance_checklist/setupSchema';
import { maintenanceChecklistResources } from '@/capabilities/maintenance_checklist/resources';
import { instructorMatchSetupSchema } from '@/capabilities/instructor_match/setupSchema';
import { instructorMatchResources } from '@/capabilities/instructor_match/resources';
import { shiftScheduleSetupSchema } from '@/capabilities/shift_schedule/setupSchema';
import { shiftScheduleResources } from '@/capabilities/shift_schedule/resources';
import { taskPipelineSetupSchema } from '@/capabilities/task_pipeline/setupSchema';
import { taskPipelineResources } from '@/capabilities/task_pipeline/resources';
import { billingInvoicingSetupSchema } from '@/capabilities/billing_invoicing/setupSchema';
import { billingInvoicingResources } from '@/capabilities/billing_invoicing/resources';
import { ledgerSimpleSetupSchema } from '@/capabilities/ledger_simple/setupSchema';
import { ledgerSimpleResources } from '@/capabilities/ledger_simple/resources';
import { creditWalletSetupSchema } from '@/capabilities/credit_wallet/setupSchema';
import { creditWalletResources } from '@/capabilities/credit_wallet/resources';
import { consultationCrmSetupSchema } from '@/capabilities/consultation_crm/setupSchema';
import { consultationCrmResources } from '@/capabilities/consultation_crm/resources';
import { treatmentChartSetupSchema } from '@/capabilities/treatment_chart/setupSchema';
import { treatmentChartResources } from '@/capabilities/treatment_chart/resources';
import { safetyConsentSetupSchema } from '@/capabilities/safety_consent/setupSchema';
import { safetyConsentResources } from '@/capabilities/safety_consent/resources';

/**
 * 전방위 17대 원자적 Capability 번들 레지스트리
 */
export const CAPABILITY_BUNDLES: Record<PresetCapabilityId, CapabilityModuleBundle> = {
  // 기존 5대 기능
  attendance: {
    capabilityId: 'attendance',
    setupSchema: attendanceSetupSchema,
    resources: attendanceResources,
  },
  passes: {
    capabilityId: 'passes',
    setupSchema: passesSetupSchema,
    resources: passesResources,
  },
  locker: {
    capabilityId: 'locker',
    setupSchema: lockerSetupSchema,
    resources: lockerResources,
  },
  booking: {
    capabilityId: 'booking',
    setupSchema: bookingSetupSchema,
    resources: bookingResources,
  },
  inventory: {
    capabilityId: 'inventory',
    setupSchema: inventorySetupSchema,
    resources: inventoryResources,
  },

  // 범주 A: 공간·시설 점유 및 자원 순환
  seat_room: {
    capabilityId: 'seat_room',
    setupSchema: seatRoomSetupSchema,
    resources: seatRoomResources,
  },
  rental_equipment: {
    capabilityId: 'rental_equipment',
    setupSchema: rentalEquipmentSetupSchema,
    resources: rentalEquipmentResources,
  },
  maintenance_checklist: {
    capabilityId: 'maintenance_checklist',
    setupSchema: maintenanceChecklistSetupSchema,
    resources: maintenanceChecklistResources,
  },

  // 범주 B: 인력 배정 및 작업 공정
  instructor_match: {
    capabilityId: 'instructor_match',
    setupSchema: instructorMatchSetupSchema,
    resources: instructorMatchResources,
  },
  shift_schedule: {
    capabilityId: 'shift_schedule',
    setupSchema: shiftScheduleSetupSchema,
    resources: shiftScheduleResources,
  },
  task_pipeline: {
    capabilityId: 'task_pipeline',
    setupSchema: taskPipelineSetupSchema,
    resources: taskPipelineResources,
  },

  // 범주 C: 정기 청구 및 무과금 원장
  billing_invoicing: {
    capabilityId: 'billing_invoicing',
    setupSchema: billingInvoicingSetupSchema,
    resources: billingInvoicingResources,
  },
  ledger_simple: {
    capabilityId: 'ledger_simple',
    setupSchema: ledgerSimpleSetupSchema,
    resources: ledgerSimpleResources,
  },
  credit_wallet: {
    capabilityId: 'credit_wallet',
    setupSchema: creditWalletSetupSchema,
    resources: creditWalletResources,
  },

  // 범주 D: 고객 맞춤 이력 & 신뢰 관리
  consultation_crm: {
    capabilityId: 'consultation_crm',
    setupSchema: consultationCrmSetupSchema,
    resources: consultationCrmResources,
  },
  treatment_chart: {
    capabilityId: 'treatment_chart',
    setupSchema: treatmentChartSetupSchema,
    resources: treatmentChartResources,
  },
  safety_consent: {
    capabilityId: 'safety_consent',
    setupSchema: safetyConsentSetupSchema,
    resources: safetyConsentResources,
  },
};

// Core 런타임 동적 레지스트리에 번들 등록
registerCapabilityBundles(CAPABILITY_BUNDLES);

/**
 * 40대 전방위 업종 프리셋 선언적 정의 (40 Industry Preset Configurations)
 *
 * Core–Capability–Preset 3계층 엄격 분리 원칙:
 * 1. 업종별 별도 애플리케이션을 복제하지 않는다.
 * 2. 원자적 Capability(17종)의 결합과 업무 규칙 선언으로 40개 업종을 온전히 표현한다.
 * 3. 각 프리셋은 필수/선택 기능, 자원 템플릿, 역할 권한, 업무 규칙 및 완성도 수준(Readiness)을 명시한다.
 */
export const INDUSTRY_PRESETS: Record<string, IndustryPresetDefinition> = {
  // ==========================================
  // Group 1: 학원·교육 (Education) - 8종
  // ==========================================
  piano: {
    id: 'piano',
    name: '피아노·음악학원',
    description: '원생 출결, 1:1 레슨 피아노 연습실 배정, 교습비 정기 청구, 교재 및 진도 관리',
    category: 'education',
    capabilities: ['seat_room', 'attendance', 'passes', 'billing_invoicing', 'consultation_crm'] as const,
    requiredCapabilities: ['seat_room', 'attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'inventory'] as const,
    businessRules: {
      lessonDurationMinutes: 30,
      autoCheckInDeduct: true,
      unpaidNoticeDayOfMonth: 25,
    },
    resourceTypes: [
      { name: '그랜드룸', type: 'room', capacity: 2 },
      { name: '연습실 1~4호', type: 'room', capacity: 1 },
      { name: '업라이트 피아노', type: 'equipment' },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'], description: '학원 총괄 및 수납·인사 전권' },
      { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'passes:view', 'consultation:*'], description: '레슨 배정 및 출결/상담' },
      { name: '파트강사', rank_order: 3, permissions: ['attendance:checkin'], description: '출결 체크인 보조' },
    ],
    onboardingSteps: ['연습실 룸 등록', '교습비 단가 및 납부일 설정', '원생 일괄 등록'],
    readinessLevel: 'verified',
  },

  general_academy: {
    id: 'general_academy',
    name: '일반 보습학원',
    description: 'PIN/QR 등하원 출결, 월 교습비 정기 청구서, 학부모 상담일지 및 수강권 관리',
    category: 'education',
    capabilities: ['attendance', 'billing_invoicing', 'consultation_crm', 'passes'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing', 'passes'] as const,
    optionalCapabilities: ['consultation_crm', 'shift_schedule'] as const,
    businessRules: {
      attendanceGraceMinutes: 10,
      tuitionBillingCycle: 'monthly',
    },
    resourceTypes: [{ name: '강의실 1~3관', type: 'room', capacity: 20 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'consultation:*'] },
      { name: '조교', rank_order: 3, permissions: ['attendance:checkin'] },
    ],
    readinessLevel: 'basic_ui',
  },

  language_academy: {
    id: 'language_academy',
    name: '어학원',
    description: '레벨별 수업 예약, 수강권 차감, 어학 실습실 및 원어민 강사 일정 관리',
    category: 'education',
    capabilities: ['attendance', 'booking', 'passes', 'billing_invoicing', 'consultation_crm'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['booking', 'consultation_crm'] as const,
    businessRules: { allowLevelReservation: true, maxStudentsPerClass: 12 },
    resourceTypes: [{ name: '어학랩실', type: 'room', capacity: 15 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '원어민강사', rank_order: 2, permissions: ['attendance:*', 'booking:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  art_academy: {
    id: 'art_academy',
    name: '미술학원',
    description: '회차별 실기 출결, 미술 재료 소모품 재고, 수강료 청구 및 포트폴리오 관리',
    category: 'education',
    capabilities: ['attendance', 'billing_invoicing', 'inventory', 'passes'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing', 'passes'] as const,
    optionalCapabilities: ['inventory', 'consultation_crm'] as const,
    businessRules: { materialFeeIncluded: true },
    resourceTypes: [{ name: '실기실', type: 'room', capacity: 12 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '실기강사', rank_order: 2, permissions: ['attendance:*', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  taekwondo_academy: {
    id: 'taekwondo_academy',
    name: '태권도장',
    description: '수련부 출결, 정기 수련권, 도복/띠 재고, 차량 탑승 및 안전 서약서',
    category: 'education',
    capabilities: ['attendance', 'passes', 'billing_invoicing', 'safety_consent'] as const,
    requiredCapabilities: ['attendance', 'passes', 'billing_invoicing'] as const,
    optionalCapabilities: ['safety_consent', 'consultation_crm'] as const,
    businessRules: { promotionBeltLevels: 9, attendancePinDigits: 4 },
    resourceTypes: [{ name: '수련장', type: 'court', capacity: 40 }],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: '사범', rank_order: 2, permissions: ['attendance:*', 'passes:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  dance_academy: {
    id: 'dance_academy',
    name: '무용·댄스학원',
    description: '클래스별 정원 예약, 무용홀 대관, 쿠폰제 수강권 차감 및 발표회 일정',
    category: 'education',
    capabilities: ['attendance', 'booking', 'passes', 'seat_room', 'billing_invoicing'] as const,
    requiredCapabilities: ['attendance', 'passes', 'seat_room'] as const,
    optionalCapabilities: ['booking', 'billing_invoicing'] as const,
    businessRules: { classCapacityLimit: 20 },
    resourceTypes: [{ name: 'A홀', type: 'room', capacity: 25 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '강사', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  coding_academy: {
    id: 'coding_academy',
    name: '코딩·IT 학원',
    description: 'PC 실습 좌석 배정, 프로젝트 과제 파이프라인, 출결 및 월 교습비 관리',
    category: 'education',
    capabilities: ['attendance', 'seat_room', 'billing_invoicing', 'task_pipeline'] as const,
    requiredCapabilities: ['attendance', 'seat_room', 'billing_invoicing'] as const,
    optionalCapabilities: ['task_pipeline', 'consultation_crm'] as const,
    businessRules: { pcSeatAssignment: true },
    resourceTypes: [{ name: 'PC실습실', type: 'room', capacity: 20 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '멘토강사', rank_order: 2, permissions: ['attendance:*', 'task_pipeline:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  exam_tutoring: {
    id: 'exam_tutoring',
    name: '입시·과외 학원',
    description: '1:1 개별지도 스케줄, 학습 플래너 상담 일지, 시급/수강료 정산 관리',
    category: 'education',
    capabilities: ['attendance', 'consultation_crm', 'billing_invoicing', 'shift_schedule'] as const,
    requiredCapabilities: ['attendance', 'consultation_crm', 'billing_invoicing'] as const,
    optionalCapabilities: ['shift_schedule', 'passes'] as const,
    businessRules: { oneOnOneSchedule: true },
    resourceTypes: [{ name: '상담지도실', type: 'room', capacity: 4 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '과외강사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 2: 체육·피트니스 (Fitness & Sports) - 8종
  // ==========================================
  pilates: {
    id: 'pilates',
    name: '필라테스 스튜디오',
    description: '리포머/체어 그룹 및 개인레슨 예약, 횟수권 차감, 강사 배정 및 락커 관리',
    category: 'fitness',
    capabilities: ['booking', 'passes', 'instructor_match', 'seat_room', 'locker'] as const,
    requiredCapabilities: ['booking', 'passes', 'instructor_match'] as const,
    optionalCapabilities: ['seat_room', 'locker', 'treatment_chart'] as const,
    businessRules: { cancelCutoffHours: 6, maxGroupCapacity: 6 },
    resourceTypes: [
      { name: '리포머룸', type: 'room', capacity: 6 },
      { name: '체어룸', type: 'room', capacity: 6 },
      { name: '개인레슨실', type: 'room', capacity: 1 },
      { name: '락커 1~30번', type: 'locker' },
    ],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '수석강사', rank_order: 2, permissions: ['booking:*', 'passes:*'] },
      { name: '강사', rank_order: 3, permissions: ['attendance:checkin', 'booking:view'] },
    ],
    readinessLevel: 'persisted',
  },

  yoga_studio: {
    id: 'yoga_studio',
    name: '요가 스튜디오',
    description: '수련 타임테이블 예약, 기간제/횟수제 이용권, 출결 체크인 및 락커 관리',
    category: 'fitness',
    capabilities: ['booking', 'passes', 'attendance', 'locker', 'seat_room'] as const,
    requiredCapabilities: ['booking', 'passes', 'attendance'] as const,
    optionalCapabilities: ['locker', 'seat_room'] as const,
    businessRules: { allowWalkInCheckIn: true },
    resourceTypes: [{ name: '메인 수련실', type: 'room', capacity: 18 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '요가강사', rank_order: 2, permissions: ['booking:*', 'attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  gym_fitness: {
    id: 'gym_fitness',
    name: '헬스장 / 피트니스 센터',
    description: '회원권 기간 관리, 입장 바코드/PIN 출결, 개인 락커 배정, 운동복 대여',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'locker', 'rental_equipment', 'ledger_simple'] as const,
    requiredCapabilities: ['passes', 'attendance', 'locker'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple'] as const,
    businessRules: { membershipHoldMaxDays: 30 },
    resourceTypes: [
      { name: '헬스존', type: 'room', capacity: 100 },
      { name: '개인락커', type: 'locker' },
      { name: '회원복', type: 'equipment' },
    ],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: 'FC/트레이너', rank_order: 2, permissions: ['passes:*', 'locker:*'] },
    ],
    readinessLevel: 'persisted',
  },

  pt_fitness: {
    id: 'pt_fitness',
    name: '1:1 피트니스 / PT 샵',
    description: 'PT 세션 차감권, 트레이너 배정, 고객 체형 상담 일지 및 락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'instructor_match', 'consultation_crm', 'locker'] as const,
    requiredCapabilities: ['passes', 'booking', 'instructor_match'] as const,
    optionalCapabilities: ['consultation_crm', 'locker', 'treatment_chart'] as const,
    businessRules: { ptSessionDurationMinutes: 50 },
    resourceTypes: [{ name: 'PT 세션존', type: 'room', capacity: 3 }],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '트레이너', rank_order: 2, permissions: ['booking:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  indoor_golf: {
    id: 'indoor_golf',
    name: '실내 골프연습장',
    description: '타석/레슨 예약, 정기 회원권, 골프백 락커, 대여채 및 간이 시재 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'locker', 'rental_equipment', 'ledger_simple'] as const,
    requiredCapabilities: ['passes', 'booking', 'locker'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple', 'instructor_match'] as const,
    businessRules: { bayReservationMinutes: 60 },
    resourceTypes: [
      { name: '타석 1~12번', type: 'bay', capacity: 1 },
      { name: '골프백 락커', type: 'locker' },
      { name: '연습채', type: 'equipment' },
    ],
    roles: [
      { name: '점장', rank_order: 1, permissions: ['*'] },
      { name: '레슨프로', rank_order: 2, permissions: ['booking:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  swim_school: {
    id: 'swim_school',
    name: '수영장·수영교실',
    description: '레인별 강습 예약, 정기 회원권, 탈의실 락커 배정 및 안전 서약서',
    category: 'fitness',
    capabilities: ['attendance', 'passes', 'booking', 'locker', 'safety_consent'] as const,
    requiredCapabilities: ['attendance', 'passes', 'locker'] as const,
    optionalCapabilities: ['booking', 'safety_consent'] as const,
    businessRules: { laneCapacityLimit: 15 },
    resourceTypes: [
      { name: '25m 레인 1~6', type: 'court', capacity: 15 },
      { name: '탈의실 락커', type: 'locker' },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'] },
      { name: '수영강사', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  climbing_activity: {
    id: 'climbing_activity',
    name: '클라이밍 & 액티비티 짐',
    description: '일일/정기 이용권, 암벽화/장비 대여, 전자 면책 동의서 및 출결/락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'rental_equipment', 'safety_consent', 'locker'] as const,
    requiredCapabilities: ['passes', 'attendance', 'safety_consent'] as const,
    optionalCapabilities: ['rental_equipment', 'locker'] as const,
    businessRules: { mandatorySafetyWaiver: true },
    resourceTypes: [
      { name: '볼더링 벽 A~D', type: 'court', capacity: 25 },
      { name: '암벽화 렌탈', type: 'equipment' },
    ],
    roles: [
      { name: '센터장', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['attendance:*', 'rental_equipment:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  boxing_mma: {
    id: 'boxing_mma',
    name: '복싱·격투기 체육관',
    description: '수련 출결 체크, 정기 이용권, 글러브/보호구 대여, 안전 서약 및 락커',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'locker', 'safety_consent', 'rental_equipment'] as const,
    requiredCapabilities: ['passes', 'attendance', 'safety_consent'] as const,
    optionalCapabilities: ['locker', 'rental_equipment'] as const,
    businessRules: { mandatorySafetyWaiver: true },
    resourceTypes: [
      { name: '링 & 샌드백존', type: 'court', capacity: 30 },
      { name: '락커', type: 'locker' },
    ],
    roles: [
      { name: '관장', rank_order: 1, permissions: ['*'] },
      { name: '코치', rank_order: 2, permissions: ['attendance:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 3: 뷰티·웰빙 (Beauty & Wellness) - 8종
  // ==========================================
  hair_salon: {
    id: 'hair_salon',
    name: '헤어샵 / 뷰티 살롱',
    description: '디자이너 예약, 염색약/시술 차트, 스태프 근무표 및 일일 매출 마감',
    category: 'beauty',
    capabilities: ['booking', 'treatment_chart', 'shift_schedule', 'ledger_simple', 'inventory'] as const,
    requiredCapabilities: ['booking', 'treatment_chart', 'shift_schedule'] as const,
    optionalCapabilities: ['ledger_simple', 'inventory'] as const,
    businessRules: { doubleBookingAllowed: false, slotMinutes: 30 },
    resourceTypes: [
      { name: '경대 1~6', type: 'seat', capacity: 1 },
      { name: '샴푸실', type: 'room', capacity: 2 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '디자이너', rank_order: 2, permissions: ['booking:*', 'treatment_chart:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  barber_shop: {
    id: 'barber_shop',
    name: '바버숍',
    description: '바버별 1:1 예약, 면도/커트 시술 이력, 근무표 및 일일 시재 마감',
    category: 'beauty',
    capabilities: ['booking', 'shift_schedule', 'ledger_simple', 'inventory'] as const,
    requiredCapabilities: ['booking', 'shift_schedule'] as const,
    optionalCapabilities: ['ledger_simple', 'inventory'] as const,
    businessRules: { slotMinutes: 45 },
    resourceTypes: [{ name: '바버체어 1~3', type: 'seat', capacity: 1 }],
    roles: [
      { name: '마스터바버', rank_order: 1, permissions: ['*'] },
      { name: '바버', rank_order: 2, permissions: ['booking:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  nail_salon: {
    id: 'nail_salon',
    name: '네일숍',
    description: '아트/젤네일 예약, 선불 회원권 잔액 차감, 젤네일 컬러 차트 및 재고',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'treatment_chart', 'inventory', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'passes'] as const,
    optionalCapabilities: ['treatment_chart', 'inventory', 'ledger_simple'] as const,
    businessRules: { prepaidPassBalanceDeduct: true },
    resourceTypes: [
      { name: '네일 테이블 1~3', type: 'table', capacity: 1 },
      { name: '패디 체어', type: 'seat', capacity: 1 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '아티스트', rank_order: 2, permissions: ['booking:*', 'passes:deduct'] },
    ],
    readinessLevel: 'basic_ui',
  },

  skin_clinic: {
    id: 'skin_clinic',
    name: '피부관리실·에스테틱',
    description: '스킨케어 룸 예약, 코스 티켓팅 차감, 피부 진단 차트 및 에스테틱 화장품 재고',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'treatment_chart', 'consultation_crm', 'inventory'] as const,
    requiredCapabilities: ['booking', 'passes', 'treatment_chart'] as const,
    optionalCapabilities: ['consultation_crm', 'inventory'] as const,
    businessRules: { skinAnalysisBeforeTreatment: true },
    resourceTypes: [
      { name: '관리실 1~3', type: 'room', capacity: 2 },
      { name: '에스테틱 베드', type: 'seat', capacity: 1 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '관리사', rank_order: 2, permissions: ['booking:*', 'treatment_chart:*', 'passes:*'] },
    ],
    readinessLevel: 'persisted',
  },

  massage_spa: {
    id: 'massage_spa',
    name: '마사지·스파',
    description: '개인/커플 스파룸 예약, 관리사 근무 교대, 정기 바우처 및 간이 정산',
    category: 'beauty',
    capabilities: ['booking', 'passes', 'shift_schedule', 'seat_room', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'shift_schedule'] as const,
    optionalCapabilities: ['passes', 'ledger_simple'] as const,
    businessRules: { coupleRoomAvailable: true },
    resourceTypes: [{ name: '스파룸 1~4', type: 'room', capacity: 2 }],
    roles: [
      { name: '관리자', rank_order: 1, permissions: ['*'] },
      { name: '테라피스트', rank_order: 2, permissions: ['booking:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  tattoo_studio: {
    id: 'tattoo_studio',
    name: '타투 스튜디오',
    description: '도안 상담, 예약 일정, 전자 면책 서약서, 작업 단계 파이프라인 관리',
    category: 'beauty',
    capabilities: ['booking', 'safety_consent', 'consultation_crm', 'task_pipeline'] as const,
    requiredCapabilities: ['booking', 'safety_consent'] as const,
    optionalCapabilities: ['consultation_crm', 'task_pipeline'] as const,
    businessRules: { ageVerificationRequired: true, waiverMandatory: true },
    resourceTypes: [{ name: '작업 부스 1~2', type: 'room', capacity: 1 }],
    roles: [
      { name: '아티스트', rank_order: 1, permissions: ['*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  photo_studio: {
    id: 'photo_studio',
    name: '사진 스튜디오',
    description: '컨셉 촬영실 예약, 장비 대여, 보정/인화 작업 파이프라인 및 정산',
    category: 'beauty',
    capabilities: ['booking', 'rental_equipment', 'seat_room', 'task_pipeline', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'task_pipeline'] as const,
    optionalCapabilities: ['rental_equipment', 'ledger_simple'] as const,
    businessRules: { proofingPipelineSteps: 3 },
    resourceTypes: [
      { name: '호리존 스튜디오', type: 'room', capacity: 10 },
      { name: '조명/렌즈', type: 'equipment' },
    ],
    roles: [
      { name: '실장/작가', rank_order: 1, permissions: ['*'] },
      { name: '보정스태프', rank_order: 2, permissions: ['task_pipeline:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  pet_grooming: {
    id: 'pet_grooming',
    name: '반려동물 미용실',
    description: '반려견 체중/견종별 예약, 미용 특이사항 차트, 스파 관리 및 간이 매출',
    category: 'beauty',
    capabilities: ['booking', 'consultation_crm', 'treatment_chart', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'treatment_chart'] as const,
    optionalCapabilities: ['consultation_crm', 'ledger_simple'] as const,
    businessRules: { rabiesVaccinationCheck: true },
    resourceTypes: [
      { name: '미용 테이블', type: 'table', capacity: 1 },
      { name: '하이드로바스', type: 'equipment' },
    ],
    roles: [
      { name: '원장미용사', rank_order: 1, permissions: ['*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 4: 공간·대여·숙박 (Space & Rental) - 6종
  // ==========================================
  study_cafe: {
    id: 'study_cafe',
    name: '스터디카페 / 공간대여',
    description: '좌석 점유 타이머, 시간제 이용권, 사물함 및 일일 청소 점검 루틴 중심',
    category: 'studio',
    capabilities: ['seat_room', 'passes', 'locker', 'maintenance_checklist'] as const,
    requiredCapabilities: ['seat_room', 'passes'] as const,
    optionalCapabilities: ['locker', 'maintenance_checklist'] as const,
    businessRules: { timePassAutoExpire: true },
    resourceTypes: [
      { name: '자유석 1~50', type: 'seat', capacity: 1 },
      { name: '스터디룸 A, B', type: 'room', capacity: 6 },
      { name: '사물함 1~60', type: 'locker' },
    ],
    roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  shared_office: {
    id: 'shared_office',
    name: '공유오피스',
    description: '지정석/독립실 배정, 월간 청구서, 회의실 예약 및 시설 점검 루틴',
    category: 'studio',
    capabilities: ['seat_room', 'passes', 'billing_invoicing', 'maintenance_checklist', 'booking'] as const,
    requiredCapabilities: ['seat_room', 'billing_invoicing'] as const,
    optionalCapabilities: ['booking', 'passes', 'maintenance_checklist'] as const,
    businessRules: { monthlyRentBillingDay: 1 },
    resourceTypes: [
      { name: '독립오피스 1~8', type: 'room', capacity: 4 },
      { name: '회의실', type: 'room', capacity: 10 },
      { name: '핫데스크', type: 'seat', capacity: 1 },
    ],
    roles: [{ name: '센터장', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  space_rental: {
    id: 'space_rental',
    name: '공간대여·대관업',
    description: '파티룸/스튜디오 시간 단위 대관, 보증금/시재 관리 및 퇴실 청소 점검',
    category: 'studio',
    capabilities: ['booking', 'seat_room', 'ledger_simple', 'maintenance_checklist'] as const,
    requiredCapabilities: ['booking', 'seat_room'] as const,
    optionalCapabilities: ['ledger_simple', 'maintenance_checklist'] as const,
    businessRules: { securityDepositRequired: true },
    resourceTypes: [{ name: '파티룸 루프탑', type: 'room', capacity: 15 }],
    roles: [{ name: '호스트', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  locker_storage: {
    id: 'locker_storage',
    name: '사물함·개인창고 대여업',
    description: '수납 락커/스토리지 유닛 배정, 정기 자동 청구 및 잠금장치 점검',
    category: 'studio',
    capabilities: ['locker', 'passes', 'billing_invoicing', 'maintenance_checklist'] as const,
    requiredCapabilities: ['locker', 'billing_invoicing'] as const,
    optionalCapabilities: ['passes', 'maintenance_checklist'] as const,
    businessRules: { lockerOverdueLockout: true },
    resourceTypes: [{ name: '개인창고 1~20', type: 'locker' }],
    roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  guesthouse: {
    id: 'guesthouse',
    name: '게스트하우스',
    description: '도미토리 베드/객실 예약, 일일 입실/퇴실, 시재 마감 및 침구 교체 점검',
    category: 'travel',
    capabilities: ['booking', 'seat_room', 'maintenance_checklist', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room'] as const,
    optionalCapabilities: ['maintenance_checklist', 'ledger_simple'] as const,
    businessRules: { checkInHour: 15, checkOutHour: 11 },
    resourceTypes: [
      { name: '도미토리 베드 1~8', type: 'seat', capacity: 1 },
      { name: '2인 전용실', type: 'room', capacity: 2 },
    ],
    roles: [{ name: '호스트', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  small_hotel: {
    id: 'small_hotel',
    name: '소형 호텔 / 부티크 호텔',
    description: '객실 타입별 숙박 예약, 프론트 교대 근무표, 하우스키핑 룸체크 및 현금 시재',
    category: 'travel',
    capabilities: ['booking', 'seat_room', 'maintenance_checklist', 'shift_schedule', 'ledger_simple'] as const,
    requiredCapabilities: ['booking', 'seat_room', 'maintenance_checklist'] as const,
    optionalCapabilities: ['shift_schedule', 'ledger_simple'] as const,
    businessRules: { housekeepingInspectionRequired: true },
    resourceTypes: [
      { name: '스탠다드룸 201~210', type: 'room', capacity: 2 },
      { name: '디럭스룸 301~305', type: 'room', capacity: 3 },
    ],
    roles: [
      { name: '총지배인', rank_order: 1, permissions: ['*'] },
      { name: '프론트스태프', rank_order: 2, permissions: ['booking:*', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 5: 도소매·외식 (Retail & Food) - 6종
  // ==========================================
  retail: {
    id: 'retail',
    name: '일반 소매점',
    description: '바코드 상품 카탈로그, 재고 수불, POS 판매 및 포인트 적립/사용',
    category: 'other',
    capabilities: ['inventory', 'credit_wallet', 'ledger_simple'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet'] as const,
    businessRules: { pointEarnPercent: 1.0, lowStockAlertThreshold: 5 },
    resourceTypes: [{ name: 'POS 카운터', type: 'equipment' }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '캐셔', rank_order: 2, permissions: ['inventory:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'isolated',
  },

  apparel_store: {
    id: 'apparel_store',
    name: '의류매장',
    description: '사이즈/색상 옵션 재고, 피팅룸 관리, 멤버십 포인트 및 스태프 근무',
    category: 'other',
    capabilities: ['inventory', 'ledger_simple', 'credit_wallet', 'shift_schedule'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet', 'shift_schedule'] as const,
    businessRules: { sizeColorSkuSupport: true },
    resourceTypes: [{ name: '피팅룸 1~2', type: 'room', capacity: 1 }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['inventory:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  convenience_store: {
    id: 'convenience_store',
    name: '편의점',
    description: '식음료/생필품 고회전 재고, 3교대 알바 근무표, 일일 시재 마감 및 점검',
    category: 'other',
    capabilities: ['inventory', 'shift_schedule', 'ledger_simple', 'maintenance_checklist'] as const,
    requiredCapabilities: ['inventory', 'shift_schedule', 'ledger_simple'] as const,
    optionalCapabilities: ['maintenance_checklist'] as const,
    businessRules: { shiftHandoverCashCount: true },
    resourceTypes: [{ name: '포스기', type: 'equipment' }],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '근무자', rank_order: 2, permissions: ['shift_schedule:view', 'ledger_simple:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  pet_supplies: {
    id: 'pet_supplies',
    name: '반려동물용품점',
    description: '사료/간식 유통기한 재고, 반려동물 등록 상담, 포인트 적립 및 정산',
    category: 'other',
    capabilities: ['inventory', 'ledger_simple', 'credit_wallet', 'consultation_crm'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple'] as const,
    optionalCapabilities: ['credit_wallet', 'consultation_crm'] as const,
    businessRules: { expiryDateTracking: true },
    resourceTypes: [{ name: '매대', type: 'table' }],
    roles: [{ name: '점주', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  cafe: {
    id: 'cafe',
    name: '카페 / 디저트전문점',
    description: '원두/부자재 재고, 테이블 홀 좌석, 바리스타 시프트 근무 및 선불 충전금',
    category: 'food',
    capabilities: ['inventory', 'seat_room', 'ledger_simple', 'shift_schedule', 'credit_wallet'] as const,
    requiredCapabilities: ['inventory', 'ledger_simple', 'shift_schedule'] as const,
    optionalCapabilities: ['seat_room', 'credit_wallet'] as const,
    businessRules: { prepaidCardDiscount: 5 },
    resourceTypes: [
      { name: '에스프레소 머신', type: 'equipment' },
      { name: '홀 테이블 1~8', type: 'table', capacity: 4 },
    ],
    roles: [
      { name: '점주', rank_order: 1, permissions: ['*'] },
      { name: '바리스타', rank_order: 2, permissions: ['shift_schedule:view', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  restaurant: {
    id: 'restaurant',
    name: '소형 음식점 / 식당',
    description: '테이블 좌석 예약, 식자재 식별 재고, 주방/홀 근무 교대 및 일일 결산',
    category: 'food',
    capabilities: ['booking', 'seat_room', 'inventory', 'ledger_simple', 'shift_schedule'] as const,
    requiredCapabilities: ['seat_room', 'ledger_simple', 'shift_schedule'] as const,
    optionalCapabilities: ['booking', 'inventory'] as const,
    businessRules: { reservationDepositPolicy: false },
    resourceTypes: [{ name: '식탁 테이블 1~10', type: 'table', capacity: 4 }],
    roles: [
      { name: '사장', rank_order: 1, permissions: ['*'] },
      { name: '스태프', rank_order: 2, permissions: ['booking:view', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // Group 6: 생활서비스·정비·특수 (Service & Automotive) - 4종
  // ==========================================
  auto_repair: {
    id: 'auto_repair',
    name: '자동차 정비소',
    description: '정비 리프트 배정, 부품 재고, 작업지시서 파이프라인, 차량 수리 이력 및 청구',
    category: 'automotive',
    capabilities: ['task_pipeline', 'inventory', 'billing_invoicing', 'consultation_crm', 'booking'] as const,
    requiredCapabilities: ['task_pipeline', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'booking'] as const,
    businessRules: { vinRequired: true, workOrderStages: 4 },
    resourceTypes: [
      { name: '리프트 베이 1~3', type: 'bay', capacity: 1 },
      { name: '진단기', type: 'equipment' },
    ],
    roles: [
      { name: '대표/공장장', rank_order: 1, permissions: ['*'] },
      { name: '정비기사', rank_order: 2, permissions: ['task_pipeline:*', 'inventory:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  cleaning_service: {
    id: 'cleaning_service',
    name: '청소·방문 서비스 업체',
    description: '클리너 출장 배정 근무표, 현장 작업 체크리스트, 완료 확인서 및 청구서 발행',
    category: 'property',
    capabilities: ['shift_schedule', 'task_pipeline', 'billing_invoicing', 'consultation_crm', 'booking'] as const,
    requiredCapabilities: ['shift_schedule', 'task_pipeline', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'booking'] as const,
    businessRules: { dispatchAddressRequired: true },
    resourceTypes: [{ name: '서비스 차량', type: 'vehicle' }],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '현장팀장', rank_order: 2, permissions: ['task_pipeline:*', 'shift_schedule:view'] },
    ],
    readinessLevel: 'basic_ui',
  },

  pet_hotel: {
    id: 'pet_hotel',
    name: '반려동물 호텔·유치원',
    description: '호텔룸/유치원 좌석 점유, 등원 출결 체크, 알림장 상담 일지 및 시설 위생 점검',
    category: 'pet',
    capabilities: ['seat_room', 'attendance', 'passes', 'consultation_crm', 'maintenance_checklist'] as const,
    requiredCapabilities: ['seat_room', 'attendance', 'passes'] as const,
    optionalCapabilities: ['consultation_crm', 'maintenance_checklist'] as const,
    businessRules: { emergencyContactMandatory: true },
    resourceTypes: [
      { name: '호텔룸 1~10', type: 'room', capacity: 1 },
      { name: '놀이방', type: 'court', capacity: 15 },
    ],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '케어강사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  equipment_rental: {
    id: 'equipment_rental',
    name: '장비·렌탈업',
    description: '건설/촬영/파티 장비 대여, 장비 일련번호 재고, 대여료 청구 및 안전 서약',
    category: 'studio',
    capabilities: ['rental_equipment', 'inventory', 'passes', 'billing_invoicing', 'safety_consent'] as const,
    requiredCapabilities: ['rental_equipment', 'inventory', 'billing_invoicing'] as const,
    optionalCapabilities: ['passes', 'safety_consent'] as const,
    businessRules: { returnInspectionMandatory: true, lateFeeDailyRate: true },
    resourceTypes: [
      { name: '대여 장비 창고', type: 'room' },
      { name: '렌탈 기기 목록', type: 'equipment' },
    ],
    roles: [
      { name: '대표', rank_order: 1, permissions: ['*'] },
      { name: '출고관리원', rank_order: 2, permissions: ['rental_equipment:*', 'inventory:*'] },
    ],
    readinessLevel: 'basic_ui',
  },

  // ==========================================
  // 추가 2종 (레거시 호환 및 기타 특수 프리셋)
  // ==========================================
  craft_repair: {
    id: 'craft_repair',
    name: '맞춤 제작 공방 & 수리점',
    description: '단계별 제작/수리 칸반 파이프라인, 원자재 재고 관리 및 픽업 예약',
    category: 'studio',
    capabilities: ['task_pipeline', 'inventory', 'booking', 'ledger_simple'] as const,
    requiredCapabilities: ['task_pipeline', 'inventory'] as const,
    optionalCapabilities: ['booking', 'ledger_simple'] as const,
    resourceTypes: [{ name: '작업대', type: 'table' }],
    roles: [{ name: '공방장', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  self_carwash: {
    id: 'self_carwash',
    name: '셀프 세차장 & 코인샵',
    description: 'RF카드 선불 충전금/보너스, 시설 기물 루틴 점검 및 세차 소모품 재고 관리',
    category: 'automotive',
    capabilities: ['credit_wallet', 'maintenance_checklist', 'inventory'] as const,
    requiredCapabilities: ['credit_wallet', 'maintenance_checklist'] as const,
    optionalCapabilities: ['inventory'] as const,
    resourceTypes: [{ name: '세차 베이 1~6', type: 'bay' }],
    roles: [{ name: '점주', rank_order: 1, permissions: ['*'] }],
    readinessLevel: 'basic_ui',
  },

  daycare: {
    id: 'daycare',
    name: '어린이집·유치원',
    description: '원아 등하원 출결, 보육료 결제, 학부모 상담 및 안전 동의서 관리',
    category: 'childcare',
    capabilities: ['attendance', 'billing_invoicing', 'consultation_crm', 'safety_consent'] as const,
    requiredCapabilities: ['attendance', 'billing_invoicing'] as const,
    optionalCapabilities: ['consultation_crm', 'safety_consent'] as const,
    resourceTypes: [{ name: '보육실 (반)', type: 'room', capacity: 15 }],
    roles: [
      { name: '원장', rank_order: 1, permissions: ['*'] },
      { name: '보육교사', rank_order: 2, permissions: ['attendance:*', 'consultation_crm:*'] },
    ],
    readinessLevel: 'persisted',
  },

  sauna_jjimjilbang: {
    id: 'sauna_jjimjilbang',
    name: '사우나·찜질방',
    description: '남녀 락커 배정, 이용권/회원권, 선불 크레딧 및 시설 점검 루틴 관리',
    category: 'wellness',
    capabilities: ['locker', 'passes', 'maintenance_checklist', 'credit_wallet'] as const,
    requiredCapabilities: ['locker', 'passes'] as const,
    optionalCapabilities: ['maintenance_checklist', 'credit_wallet'] as const,
    resourceTypes: [{ name: '사물함/락커', type: 'locker', capacity: 100 }],
    roles: [
      { name: '사장', rank_order: 1, permissions: ['*'] },
      { name: '주간 카운터', rank_order: 2, permissions: ['passes:*', 'lockers:*'] },
      { name: '야간 카운터', rank_order: 3, permissions: ['passes:deduct', 'lockers:assign'] },
    ],
    readinessLevel: 'persisted',
  },
};

export const PRESET_ALIASES: Record<string, string> = {
  gym: 'gym_fitness',
  academy: 'general_academy',
  private_tutoring: 'exam_tutoring',
  personal_training: 'pt_fitness',
  golf_lesson: 'indoor_golf',
  climbing_gym: 'climbing_activity',
  hotel_pension: 'guesthouse',
  craft_workshop: 'craft_repair',
  car_wash: 'self_carwash',
  sauna: 'sauna_jjimjilbang',
  sauna_jjimjbang: 'sauna_jjimjilbang',
  preschool: 'daycare',
  kindergarten: 'daycare',
};

export function getIndustryPreset(presetId: string): IndustryPresetDefinition | undefined {
  if (!presetId) return undefined;
  const direct = INDUSTRY_PRESETS[presetId];
  if (direct) return direct;
  const aliasedKey = PRESET_ALIASES[presetId];
  if (aliasedKey) return INDUSTRY_PRESETS[aliasedKey];
  return undefined;
}

export function listIndustryPresets(): IndustryPresetDefinition[] {
  return Object.values(INDUSTRY_PRESETS);
}

