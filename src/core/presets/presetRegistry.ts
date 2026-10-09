/**
 * Multi-vertical Industry Preset Registry & Capability Registry
 *
 * 3계층 엄격 분리 원칙:
 * Industry Preset은 단지 활성화할 Capability들의 배열 선언(Configuration)일 뿐이다.
 * 각 Capability는 독립적으로 setupSchema와 resources를 소유하며,
 * 프리셋 엔진이 이를 동적으로 병합한다.
 */

import type {
  CapabilityResourceDefinition,
  CapabilitySetupSchema,
  IndustryPresetDefinition,
  PresetCapabilityId,
} from './types';

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

export interface CapabilityModuleBundle {
  capabilityId: PresetCapabilityId;
  setupSchema: CapabilitySetupSchema;
  resources: CapabilityResourceDefinition;
}

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

/**
 * 8대 신규 다업종 프리셋 선언적 정의 (Industry Preset Configurations)
 *
 * 1. 스터디카페 / 공간대여: [seat_room, passes, locker, maintenance_checklist]
 * 2. 실내 골프연습장: [passes, booking, locker, rental_equipment, ledger_simple]
 * 3. 1:1 피트니스 / PT 샵: [passes, booking, instructor_match, consultation_crm, locker]
 * 4. 헤어샵 / 뷰티 살롱: [booking, treatment_chart, shift_schedule, ledger_simple]
 * 5. 맞춤 제작 공방 & 수리점: [task_pipeline, inventory, booking, ledger_simple]
 * 6. 보습 / 입시 종합학원: [attendance, billing_invoicing, consultation_crm, passes]
 * 7. 클라이밍 & 액티비티 짐: [passes, attendance, rental_equipment, safety_consent, locker]
 * 8. 셀프 세차장 & 코인샵: [credit_wallet, maintenance_checklist, inventory]
 */
export const INDUSTRY_PRESETS: Record<string, IndustryPresetDefinition> = {
  study_cafe: {
    id: 'study_cafe',
    name: '스터디카페 / 공간대여',
    description: '좌석 점유 타이머, 시간제 이용권, 사물함 및 일일 청소 점검 루틴 중심',
    category: 'studio',
    capabilities: ['seat_room', 'passes', 'locker', 'maintenance_checklist'] as const,
  },

  indoor_golf: {
    id: 'indoor_golf',
    name: '실내 골프연습장',
    description: '타석/레슨 예약, 정기 회원권, 골프백 락커, 대여채 및 간이 시재 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'locker', 'rental_equipment', 'ledger_simple'] as const,
  },

  pt_fitness: {
    id: 'pt_fitness',
    name: '1:1 피트니스 / PT 샵',
    description: 'PT 세션 차감권, 트레이너 배정, 고객 체형 상담 일지 및 락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'booking', 'instructor_match', 'consultation_crm', 'locker'] as const,
  },

  hair_salon: {
    id: 'hair_salon',
    name: '헤어샵 / 뷰티 살롱',
    description: '헤어 디자이너 예약, 염색약/시술 차트, 스태프 근무표 및 일일 매출 마감',
    category: 'beauty',
    capabilities: ['booking', 'treatment_chart', 'shift_schedule', 'ledger_simple'] as const,
  },

  craft_repair: {
    id: 'craft_repair',
    name: '맞춤 제작 공방 & 수리점',
    description: '단계별 제작/수리 칸반 파이프라인, 원자재 재고 관리 및 픽업 예약',
    category: 'studio',
    capabilities: ['task_pipeline', 'inventory', 'booking', 'ledger_simple'] as const,
  },

  general_academy: {
    id: 'general_academy',
    name: '보습 / 입시 종합학원',
    description: 'PIN/QR 등하원 출결, 월 교습비 정기 청구서, 학부모 상담일지 및 수강권 관리',
    category: 'education',
    capabilities: ['attendance', 'billing_invoicing', 'consultation_crm', 'passes'] as const,
  },

  climbing_activity: {
    id: 'climbing_activity',
    name: '클라이밍 & 액티비티 짐',
    description: '일일/정기 이용권, 암벽화/장비 대여, 전자 면책 동의서 및 출결/락커 관리',
    category: 'fitness',
    capabilities: ['passes', 'attendance', 'rental_equipment', 'safety_consent', 'locker'] as const,
  },

  self_carwash: {
    id: 'self_carwash',
    name: '셀프 세차장 & 코인샵',
    description: 'RF카드 선불 충전금/보너스, 시설 기물 루틴 점검 및 세차 소모품 재고 관리',
    category: 'automotive',
    capabilities: ['credit_wallet', 'maintenance_checklist', 'inventory'] as const,
  },
};

export function getIndustryPreset(presetId: string): IndustryPresetDefinition | undefined {
  return INDUSTRY_PRESETS[presetId];
}

export function listIndustryPresets(): IndustryPresetDefinition[] {
  return Object.values(INDUSTRY_PRESETS);
}
