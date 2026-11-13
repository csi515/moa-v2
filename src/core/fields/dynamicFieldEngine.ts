/**
 * Universal Dynamic Entity Custom Fields Engine (DECFE).
 *
 * 고객(customer), 학생(student), 제품(product), 자원(resource),
 * 업무(task), 상담(consultation) 등 모든 엔터티에 대해
 * 업종 프리셋 기반의 동적 커스텀 필드를 선언·검증하고
 * PostgreSQL metadata JSONB에 Universal Metadata Specification (UMS) 규격으로 안전하게 보관합니다.
 *
 * 아키텍처 규칙:
 * - core 계층에 위치하므로 capability/industry 모듈을 직접 import하지 않습니다.
 * - @/types barrel을 import하지 않습니다.
 * - 기존 metadata flat 구조와 신규 UMS (metadata.custom_fields) 구조를 모두 완벽히 하위 호환합니다.
 */

export type EntityType =
  | 'customer'
  | 'student'
  | 'product'
  | 'resource'
  | 'task'
  | 'consultation'
  | 'policy'
  | 'checklist'
  | 'generic';

export type CustomFieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'boolean'
  | 'date'
  | 'textarea'
  | 'json';

export interface CustomFieldOption {
  label: string;
  value: string;
}

export interface CustomFieldValidationRule {
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: (value: unknown) => boolean | string;
}

export interface CustomFieldDefinition {
  key: string;
  label: string;
  type: CustomFieldType;
  required?: boolean;
  placeholder?: string;
  options?: readonly (string | CustomFieldOption)[];
  defaultValue?: unknown;
  description?: string;
  validationRule?: CustomFieldValidationRule;
}

/**
 * Universal Metadata Specification (UMS) 규격
 */
export interface UniversalMetadata {
  _schema_version?: number;
  _preset_id?: string;
  _updated_by?: string;
  _updated_at?: string;
  custom_fields?: Record<string, unknown>;
  system_flags?: Record<string, boolean>;
  [key: string]: unknown; // 레거시 flat 필드 하위 호환 허용
}

/**
 * 전사 엔터티별 커스텀 필드 메모리 레지스트리
 * 키 포맷: `${entityType}:${normalizedIndustry}`
 */
const ENTITY_FIELD_REGISTRY = new Map<string, readonly CustomFieldDefinition[]>();

/**
 * 엔터티 및 업종별 커스텀 필드 등록
 */
export function registerEntityCustomFields(
  entityType: EntityType,
  industry: string,
  fields: readonly CustomFieldDefinition[]
): void {
  const normIndustry = (industry || 'default').trim().toLowerCase();
  const regKey = `${entityType}:${normIndustry}`;
  ENTITY_FIELD_REGISTRY.set(regKey, Object.freeze([...fields]));
}

/**
 * 엔터티 및 업종별 커스텀 필드 조회
 */
export function getEntityCustomFields(
  entityType: EntityType,
  industry?: string | null
): readonly CustomFieldDefinition[] {
  const normIndustry = (industry || 'default').trim().toLowerCase();
  const specificKey = `${entityType}:${normIndustry}`;

  if (ENTITY_FIELD_REGISTRY.has(specificKey)) {
    return ENTITY_FIELD_REGISTRY.get(specificKey)!;
  }

  // 폴백: default
  const defaultKey = `${entityType}:default`;
  if (ENTITY_FIELD_REGISTRY.has(defaultKey)) {
    return ENTITY_FIELD_REGISTRY.get(defaultKey)!;
  }

  return [];
}

/**
 * 등록된 모든 엔터티 필드 레지스트리 비우기 (테스트 격리용)
 */
export function clearEntityFieldRegistryForTest(): void {
  ENTITY_FIELD_REGISTRY.clear();
}

/**
 * metadata 객체에서 커스텀 필드 값들을 안전하게 추출
 * (신규 UMS metadata.custom_fields와 레거시 flat metadata 모두 자동 호환)
 */
export function extractEntityCustomValues(
  metadata: Record<string, any> | null | undefined,
  fields: readonly CustomFieldDefinition[]
): Record<string, any> {
  const result: Record<string, any> = {};
  if (!metadata || !fields || fields.length === 0) return result;

  const customFieldsBucket =
    metadata.custom_fields && typeof metadata.custom_fields === 'object'
      ? metadata.custom_fields
      : null;

  for (const field of fields) {
    if (customFieldsBucket && customFieldsBucket[field.key] !== undefined) {
      result[field.key] = customFieldsBucket[field.key];
    } else if (metadata[field.key] !== undefined) {
      result[field.key] = metadata[field.key];
    } else if (field.defaultValue !== undefined) {
      result[field.key] = field.defaultValue;
    }
  }

  return result;
}

/**
 * 커스텀 필드 입력값 검증
 */
export function validateEntityCustomFields(
  values: Record<string, any>,
  fields: readonly CustomFieldDefinition[]
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const val = values[field.key];

    // 1. 필수값 체크
    if (field.required) {
      if (val === undefined || val === null || val === '') {
        errors[field.key] = `${field.label}은(는) 필수 항목입니다.`;
        continue;
      }
    }

    if (val === undefined || val === null || val === '') {
      continue; // 값이 없으면 추가 포맷 검증은 스킵
    }

    // 2. 타입별 유효성 검증
    if (field.type === 'number') {
      const num = Number(val);
      if (isNaN(num)) {
        errors[field.key] = `${field.label}은(는) 유효한 숫자여야 합니다.`;
      } else if (field.validationRule) {
        if (field.validationRule.min !== undefined && num < field.validationRule.min) {
          errors[field.key] = `${field.label}은(는) 최소 ${field.validationRule.min} 이상이어야 합니다.`;
        }
        if (field.validationRule.max !== undefined && num > field.validationRule.max) {
          errors[field.key] = `${field.label}은(는) 최대 ${field.validationRule.max} 이하여야 합니다.`;
        }
      }
    }

    // 3. 정규식 패턴 검증
    if (field.validationRule?.pattern && typeof val === 'string') {
      const regex = new RegExp(field.validationRule.pattern);
      if (!regex.test(val)) {
        errors[field.key] = `${field.label} 형식이 올바르지 않습니다.`;
      }
    }

    // 4. 커스텀 검증 함수
    if (field.validationRule?.customValidator) {
      const res = field.validationRule.customValidator(val);
      if (res !== true) {
        errors[field.key] = typeof res === 'string' ? res : `${field.label} 검증에 실패했습니다.`;
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Universal Metadata Specification (UMS) 규격으로 metadata 생성 및 병합
 */
export function buildUniversalMetadata(
  existingMetadata: Record<string, any> | null | undefined,
  customValues: Record<string, any>,
  options?: {
    schemaVersion?: number;
    presetId?: string;
    updatedBy?: string;
    systemFlags?: Record<string, boolean>;
  }
): UniversalMetadata {
  const base = existingMetadata || {};
  const existingCustom =
    base.custom_fields && typeof base.custom_fields === 'object'
      ? base.custom_fields
      : {};

  const mergedCustom = {
    ...existingCustom,
    ...customValues,
  };

  const updatedMetadata: UniversalMetadata = {
    ...base,
    _schema_version: options?.schemaVersion ?? base._schema_version ?? 1,
    _preset_id: options?.presetId ?? base._preset_id,
    _updated_by: options?.updatedBy ?? base._updated_by,
    _updated_at: new Date().toISOString(),
    custom_fields: mergedCustom,
    system_flags: {
      ...(base.system_flags || {}),
      ...(options?.systemFlags || {}),
    },
    // 기존 레거시 flat 키들도 함께 업데이트하여 완벽한 하위 호환 보장
    ...customValues,
  };

  return updatedMetadata;
}
