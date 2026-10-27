import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerEntityCustomFields,
  getEntityCustomFields,
  extractEntityCustomValues,
  validateEntityCustomFields,
  buildUniversalMetadata,
  clearEntityFieldRegistryForTest,
  type CustomFieldDefinition,
} from './dynamicFieldEngine';

describe('Universal Dynamic Entity Custom Fields Engine (DECFE)', () => {
  it('자원(resource) 엔터티의 업종별 커스텀 필드를 등록하고 조회할 수 있다', () => {
    clearEntityFieldRegistryForTest();

    const vehicleFields: CustomFieldDefinition[] = [
      { key: 'plate_number', label: '차량 번호', type: 'text', required: true },
      { key: 'fuel_type', label: '유종', type: 'select', options: ['가솔린', '디젤', '전기'] },
      {
        key: 'mileage_km',
        label: '현재 주행거리',
        type: 'number',
        validationRule: { min: 0, max: 1000000 },
      },
    ];

    registerEntityCustomFields('resource', 'manufacturing_light', vehicleFields);

    const retrieved = getEntityCustomFields('resource', 'manufacturing_light');
    assert.equal(retrieved.length, 3);
    assert.equal(retrieved[0].key, 'plate_number');
    assert.equal(retrieved[0].required, true);
  });

  it('UMS 규격에 따라 커스텀 필드를 추출하고 하위 호환성을 보장한다', () => {
    const fields: CustomFieldDefinition[] = [
      { key: 'school_name', label: '학교명', type: 'text' },
      { key: 'grade', label: '학년', type: 'number', defaultValue: 1 },
    ];

    // 신규 UMS 구조 (custom_fields 버킷)
    const umsMetadata = {
      _schema_version: 1,
      _preset_id: 'piano',
      custom_fields: {
        school_name: '모아초등학교',
      },
    };

    const extractedFromUms = extractEntityCustomValues(umsMetadata, fields);
    assert.equal(extractedFromUms.school_name, '모아초등학교');
    assert.equal(extractedFromUms.grade, 1); // 기본값 폴백

    // 레거시 Flat 구조
    const legacyMetadata = {
      school_name: '서울초등학교',
      grade: 3,
    };

    const extractedFromLegacy = extractEntityCustomValues(legacyMetadata, fields);
    assert.equal(extractedFromLegacy.school_name, '서울초등학교');
    assert.equal(extractedFromLegacy.grade, 3);
  });

  it('커스텀 필드 유효성 검사(필수값, 숫자 범위, 정규식)를 엄격히 수행한다', () => {
    const fields: CustomFieldDefinition[] = [
      { key: 'temperature', label: '온도', type: 'number', required: true, validationRule: { min: -5, max: 10 } },
      { key: 'code', label: '코드', type: 'text', validationRule: { pattern: '^[A-Z]{3}-\\d{3}$' } },
    ];

    // 실패 케이스: 범위 초과 및 형식 불일치
    const invalidValues = {
      temperature: 15, // max 10 초과
      code: 'abc-12',  // 대문자 3자-숫자 3자 불일치
    };

    const validationResult = validateEntityCustomFields(invalidValues, fields);
    assert.equal(validationResult.isValid, false);
    assert.ok(validationResult.errors.temperature.includes('최대 10 이하'));
    assert.ok(validationResult.errors.code.includes('형식이 올바르지 않습니다'));

    // 성공 케이스
    const validValues = {
      temperature: 2.5,
      code: 'ENG-101',
    };

    const successResult = validateEntityCustomFields(validValues, fields);
    assert.equal(successResult.isValid, true);
    assert.equal(Object.keys(successResult.errors).length, 0);
  });

  it('buildUniversalMetadata는 UMS 구조와 레거시 flat 구조를 동시에 병합하여 안전한 JSONB 객체를 생성한다', () => {
    const existing = {
      legacy_note: '기존 메모',
      custom_fields: {
        old_field: '이전값',
      },
    };

    const newCustoms = {
      plate_number: '12가 3456',
      mileage_km: 50200,
    };

    const merged = buildUniversalMetadata(existing, newCustoms, {
      presetId: 'general_enterprise',
      updatedBy: 'user-uuid-123',
      systemFlags: { is_verified: true },
    });

    assert.equal(merged._schema_version, 1);
    assert.equal(merged._preset_id, 'general_enterprise');
    assert.equal(merged._updated_by, 'user-uuid-123');
    assert.ok(merged._updated_at);
    assert.equal(merged.custom_fields?.plate_number, '12가 3456');
    assert.equal(merged.custom_fields?.old_field, '이전값');
    assert.equal(merged.plate_number, '12가 3456'); // 레거시 flat 호환
    assert.equal(merged.legacy_note, '기존 메모');
    assert.equal(merged.system_flags?.is_verified, true);
  });
});
