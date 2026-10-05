/**
 * Industry Custom Fields Engine (JSONB Schema).
 *
 * 업종별로 상이한 고객/원생 입력 항목(피아노: 학교/레벨, 필라테스: 운동목적/라커,
 * 어린이집: 알레르기/하원방법, 피부관리: 피부타입 등)을 선언적으로 정의하고
 * customers.metadata JSONB에 안전하게 보관·검증합니다.
 *
 * 아키텍처 규칙:
 * - core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 */

import { getIndustryDefinition } from '../industry/catalog';
import { normalizeIndustryType, type IndustryType } from '../industry/types';

export type CustomFieldType = 'text' | 'number' | 'select' | 'boolean' | 'date' | 'textarea';

export interface CustomFieldOption {
  label: string;
  value: string;
}

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: CustomFieldType;
  required?: boolean;
  placeholder?: string;
  options?: readonly (string | CustomFieldOption)[];
  defaultValue?: any;
  description?: string;
}

/** 업종별 기본 커스텀 필드 프리셋 */
export const INDUSTRY_CUSTOM_FIELDS: Record<string, readonly CustomFieldDefinition[]> = {
  piano: [
    { key: 'schoolName', label: '학교/유치원', type: 'text', placeholder: '예: 모아초등학교' },
    { key: 'grade', label: '학년', type: 'text', placeholder: '예: 2학년' },
    { key: 'pianoLevel', label: '진도/과정', type: 'select', options: ['바이엘 상', '바이엘 하', '체르니 100', '체르니 30', '체르니 40', '작품집/성인'] },
  ],
  pilates: [
    {
      key: 'workoutGoal',
      label: '운동 목적',
      type: 'select',
      options: ['체형 교정/자세 개선', '근력 증진', '다이어트', '재활/통증 완화', '산전/산후 관리'],
    },
    { key: 'painAreas', label: '불편/통증 부위', type: 'text', placeholder: '예: 목, 허리 디스크' },
    { key: 'lockerNumber', label: '개인 라커 번호', type: 'text', placeholder: '예: A-12' },
  ],
  gym: [
    { key: 'beltLevel', label: '급/단', type: 'text', placeholder: '예: 1단, 노란띠' },
    { key: 'uniformSize', label: '도복 사이즈', type: 'select', options: ['120', '130', '140', '150', '160', '170', '180'] },
    { key: 'usesShuttle', label: '차량 탑승 여부', type: 'boolean', defaultValue: false },
  ],
  daycare: [
    { key: 'allergyInfo', label: '알레르기 정보', type: 'textarea', placeholder: '알레르기 유발 식품이나 약품을 입력해주세요' },
    { key: 'pickupType', label: '하원 방법', type: 'select', options: ['부모 직접 픽업', '하원 셔틀 탑승', '보호자 대리인 인계'] },
    { key: 'specialNotes', label: '건강/보육 특이사항', type: 'textarea', placeholder: '교사가 숙지해야 할 특이사항' },
  ],
  skin_clinic: [
    { key: 'skinType', label: '피부 타입', type: 'select', options: ['건성', '지성', '복합성', '민감성', '중성'] },
    { key: 'skinConcerns', label: '주요 피부 고민', type: 'text', placeholder: '예: 색소, 탄력, 여드름' },
    { key: 'skinAllergies', label: '화장품/성분 알레르기', type: 'text', placeholder: '특정 성분 반응 유무' },
  ],
  retail: [
    { key: 'preferredCategory', label: '선호 품목', type: 'text', placeholder: '예: 스킨케어, 액세서리' },
    { key: 'vipCode', label: 'VIP 회원번호', type: 'text', placeholder: 'VIP 바코드 또는 식별자' },
  ],
  sauna_jjimjilbang: [
    { key: 'lockerNumber', label: '신발/라커 번호', type: 'text', placeholder: '라커 번호' },
  ],
  bath: [
    { key: 'lockerNumber', label: '신발/라커 번호', type: 'text', placeholder: '라커 번호' },
  ],
};

/**
 * 업종에 매핑된 커스텀 필드 목록을 반환합니다.
 */
export function getCustomFieldsForIndustry(
  industry: IndustryType | string | null | undefined
): readonly CustomFieldDefinition[] {
  if (!industry) return [];

  const rawKey = String(industry).trim();
  if (INDUSTRY_CUSTOM_FIELDS[rawKey]) {
    return INDUSTRY_CUSTOM_FIELDS[rawKey];
  }

  const normalized = normalizeIndustryType(industry);
  if (normalized && INDUSTRY_CUSTOM_FIELDS[normalized]) {
    return INDUSTRY_CUSTOM_FIELDS[normalized];
  }

  // 카탈로그 카테고리 기반 폴백
  const definition = getIndustryDefinition(normalized ?? rawKey);
  if (definition?.category) {
    if (definition.category === 'education') return INDUSTRY_CUSTOM_FIELDS.piano;
    if (definition.category === 'fitness') return INDUSTRY_CUSTOM_FIELDS.pilates;
    if (definition.category === 'beauty') return INDUSTRY_CUSTOM_FIELDS.skin_clinic;
    if (definition.category === 'childcare') return INDUSTRY_CUSTOM_FIELDS.daycare;
  }

  return [];
}

/**
 * 고객 metadata에서 커스텀 필드 값들만 추출합니다.
 */
export function extractCustomFieldValues(
  metadata: Record<string, any> | null | undefined,
  fields: readonly CustomFieldDefinition[]
): Record<string, any> {
  const result: Record<string, any> = {};
  if (!metadata || !fields || fields.length === 0) return result;

  for (const field of fields) {
    if (metadata[field.key] !== undefined) {
      result[field.key] = metadata[field.key];
    } else if (field.defaultValue !== undefined) {
      result[field.key] = field.defaultValue;
    }
  }

  return result;
}

/**
 * 커스텀 필드 입력값을 검증하여 에러 맵을 반환합니다.
 */
export function validateCustomFields(
  values: Record<string, any>,
  fields: readonly CustomFieldDefinition[]
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const val = values[field.key];
    if (field.required) {
      if (val === undefined || val === null || val === '') {
        errors[field.key] = `${field.label}은(는) 필수 항목입니다.`;
      }
    }
  }

  return errors;
}

/**
 * 기존 metadata 객체에 신규 커스텀 필드 값을 안전하게 병합합니다.
 */
export function mergeCustomFieldValues(
  existingMetadata: Record<string, any> | null | undefined,
  customValues: Record<string, any>
): Record<string, any> {
  return {
    ...(existingMetadata || {}),
    ...customValues,
  };
}
