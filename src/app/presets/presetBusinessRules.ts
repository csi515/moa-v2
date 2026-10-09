/**
 * Multi-vertical Industry Preset Business Rules Engine (Composition Layer)
 *
 * 3계층 엄격 분리 원칙:
 * Core - Capability - Preset
 *
 * Capability는 특정 업종명을 직접 하드코딩 분기(if (industry === 'piano'))하지 않고,
 * 이 비즈니스 규칙 엔진을 통해 선언된 업무 규칙(options, policies, rules)을 평가한다.
 */

import { useMemo } from 'react';
import { getIndustryPreset } from './presetRegistry';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';

/**
 * 40개 전 업종 표준 비즈니스 규칙 스키마
 */
export interface StandardPresetBusinessRules {
  // 1. 예약 및 정원 규칙
  cancelCutoffHours?: number; // 취소 마감 시한 (시간 단위)
  maxGroupCapacity?: number; // 그룹 클래스 최대 정원
  doubleBookingAllowed?: boolean; // 중복 예약 허용 여부
  slotMinutes?: number; // 기본 수업/서비스 슬롯 단위 (분)
  bayReservationMinutes?: number; // 타석/타석 슬롯 단위 (분)
  allowLevelReservation?: boolean; // 레벨별 예약 허용 여부
  maxStudentsPerClass?: number; // 수업당 최대 학생수
  classCapacityLimit?: number; // 클래스 정원 상한
  laneCapacityLimit?: number; // 레인 정원 상한
  pcSeatAssignment?: boolean; // PC/좌석 지정 배정 여부
  oneOnOneSchedule?: boolean; // 1:1 전용 스케줄 여부
  ptSessionDurationMinutes?: number; // PT 세션 시간 (분)
  coupleRoomAvailable?: boolean; // 커플룸 이용 가능 여부

  // 2. 출결 및 안전 규칙
  allowWalkInCheckIn?: boolean; // 워크인/현장 즉석 체크인 허용
  attendancePinDigits?: number; // 출결 핀 자릿수
  promotionBeltLevels?: number; // 승급 띠 단계수
  mandatorySafetyWaiver?: boolean; // 안전 서약서/동의서 필수 여부
  ageVerificationRequired?: boolean; // 연령 확인 필수 여부
  waiverMandatory?: boolean; // 면책 동의서 필수 여부
  rabiesVaccinationCheck?: boolean; // 광견병 등 예방접종 확인 필수 여부
  emergencyContactMandatory?: boolean; // 비상연락처 필수 여부

  // 3. 회원권 및 사물함/공간 규칙
  membershipHoldMaxDays?: number; // 회원권 휴회 최대 일수
  timePassAutoExpire?: boolean; // 시간제 이용권 자동 만료 여부
  prepaidPassBalanceDeduct?: boolean; // 선불 차감 방식 여부
  monthlyRentBillingDay?: number; // 월 임대료 청구일
  securityDepositRequired?: boolean; // 보증금 필수 여부
  lockerOverdueLockout?: boolean; // 사물함 연체 시 자동 잠금/회수 여부
  lateFeeDailyRate?: boolean; // 일별 연체료 계산 여부
  returnInspectionMandatory?: boolean; // 반납 검수 필수 여부
  prepaidCardDiscount?: number; // 선불카드 할인율 (%)
  reservationDepositPolicy?: boolean; // 예약금 정책 적용 여부

  // 4. 상품 및 커머스/작업 규칙
  pointEarnPercent?: number; // 포인트 적립률 (%)
  lowStockAlertThreshold?: number; // 재고 부족 알림 임계값
  sizeColorSkuSupport?: boolean; // 사이즈/색상 옵션 SKU 지원
  shiftHandoverCashCount?: boolean; // 교대 시 현금 정산/시재 확인
  expiryDateTracking?: boolean; // 유통기한 추적 관리
  vinRequired?: boolean; // 차대번호(VIN) 필수 여부
  workOrderStages?: number; // 작업지시서 단계수
  dispatchAddressRequired?: boolean; // 출동/방문 주소 필수 여부
  housekeepingInspectionRequired?: boolean; // 하우스키핑/객실 점검 필수 여부
  checkInHour?: number; // 체크인 시간
  checkOutHour?: number; // 체크아웃 시간
  proofingPipelineSteps?: number; // 보정/검수 파이프라인 단계수
  skinAnalysisBeforeTreatment?: boolean; // 시술 전 피부 진단 필수 여부
  materialFeeIncluded?: boolean; // 재료비 포함 여부

  [customKey: string]: unknown;
}

export type TenantContextInput =
  | string
  | {
      industry_type?: string | null;
      settings?: unknown;
    }
  | null
  | undefined;

/**
 * 테넌트 설정 및 업종 프리셋 기본값을 병합하여 최종 업무 규칙 세트를 도출
 */
export function resolveBusinessRules(
  target: TenantContextInput
): StandardPresetBusinessRules {
  if (!target) return {};

  let industryId: string | null = null;
  let tenantCustomRules: Record<string, unknown> = {};

  if (typeof target === 'string') {
    industryId = target.trim();
  } else {
    industryId = target.industry_type ?? null;
    const settings = target.settings as Record<string, any> | null | undefined;
    if (settings && typeof settings === 'object') {
      const explicitRules =
        settings.business_rules ??
        settings.businessRules ??
        {};
      if (typeof explicitRules === 'object') {
        tenantCustomRules = explicitRules as Record<string, unknown>;
      }
    }
  }

  const preset = industryId ? getIndustryPreset(industryId) : undefined;
  const defaultRules = (preset?.businessRules ?? {}) as Record<string, unknown>;

  return {
    ...defaultRules,
    ...tenantCustomRules,
  };
}

/**
 * 특정 업무 규칙 값 조회 (미설정 시 기본값 반환)
 */
export function getBusinessRule<T>(
  target: TenantContextInput,
  ruleKey: keyof StandardPresetBusinessRules | string,
  defaultValue: T
): T {
  const rules = resolveBusinessRules(target);
  const val = rules[ruleKey as keyof StandardPresetBusinessRules];
  if (val === undefined || val === null) {
    return defaultValue;
  }
  return val as unknown as T;
}

/**
 * 불리언 비즈니스 규칙 활성화 여부 판정
 */
export function isBusinessRuleTrue(
  target: TenantContextInput,
  ruleKey: keyof StandardPresetBusinessRules | string
): boolean {
  return getBusinessRule<boolean>(target, ruleKey, false) === true;
}

/**
 * 비즈니스 규칙이 명시적으로 설정되어 있는지 여부
 */
export function hasBusinessRule(
  target: TenantContextInput,
  ruleKey: keyof StandardPresetBusinessRules | string
): boolean {
  const rules = resolveBusinessRules(target);
  return rules[ruleKey as keyof StandardPresetBusinessRules] !== undefined;
}

/**
 * React Hook: 현재 테넌트의 업무 규칙 세트 구독
 */
export function usePresetBusinessRules(
  customOrg?: TenantContextInput
): StandardPresetBusinessRules {
  const org = useOptionalOrganization();
  const effectiveOrg = customOrg !== undefined ? customOrg : org?.currentOrganization;

  return useMemo(() => {
    return resolveBusinessRules(effectiveOrg);
  }, [effectiveOrg]);
}

/**
 * React Hook: 특정 업무 규칙 값 구독
 */
export function useBusinessRule<T>(
  ruleKey: keyof StandardPresetBusinessRules | string,
  defaultValue: T,
  customOrg?: TenantContextInput
): T {
  const rules = usePresetBusinessRules(customOrg);
  const val = rules[ruleKey as keyof StandardPresetBusinessRules];
  return (val !== undefined && val !== null ? val : defaultValue) as T;
}
