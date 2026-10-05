/**
 * Custom Fields Engine unit tests.
 *
 * 실행: npx tsx src/core/customer/customFields.test.ts
 */
import assert from 'node:assert/strict';
import {
  getCustomFieldsForIndustry,
  extractCustomFieldValues,
  validateCustomFields,
  mergeCustomFieldValues,
  type CustomFieldDefinition,
} from './customFields';

function run() {
  // 1. 업종별 필드 조회
  const pianoFields = getCustomFieldsForIndustry('piano');
  assert.equal(pianoFields.length, 3);
  assert.equal(pianoFields[0].key, 'schoolName');
  assert.equal(pianoFields[1].key, 'grade');
  assert.equal(pianoFields[2].key, 'pianoLevel');

  const pilatesFields = getCustomFieldsForIndustry('pilates');
  assert.equal(pilatesFields.length, 3);
  assert.equal(pilatesFields[0].key, 'workoutGoal');
  assert.equal(pilatesFields[1].key, 'painAreas');
  assert.equal(pilatesFields[2].key, 'lockerNumber');

  const daycareFields = getCustomFieldsForIndustry('daycare');
  assert.equal(daycareFields.some((f) => f.key === 'allergyInfo'), true);
  assert.equal(daycareFields.some((f) => f.key === 'pickupType'), true);

  // 2. 카테고리 기반 자동 상속
  const artAcademyFields = getCustomFieldsForIndustry('art_academy');
  assert.equal(artAcademyFields.some((f) => f.key === 'schoolName'), true);

  const crossfitFields = getCustomFieldsForIndustry('crossfit');
  assert.equal(crossfitFields.some((f) => f.key === 'workoutGoal'), true);

  // 3. 필드 값 추출
  const testMetadata = {
    schoolName: '서울초등학교',
    grade: '3학년',
    unrelatedInternalData: 'secret-123',
  };
  const extracted = extractCustomFieldValues(testMetadata, pianoFields);
  assert.equal(extracted.schoolName, '서울초등학교');
  assert.equal(extracted.grade, '3학년');
  assert.equal(extracted.unrelatedInternalData, undefined);

  // 4. 유효성 검사 (Validation)
  const requiredFields: CustomFieldDefinition[] = [
    { key: 'name', label: '이름', type: 'text', required: true },
    { key: 'age', label: '나이', type: 'number', required: false },
  ];
  const invalidErrors = validateCustomFields({ age: 20 }, requiredFields);
  assert.ok(invalidErrors.name);
  assert.equal(invalidErrors.name, '이름은(는) 필수 항목입니다.');

  const validErrors = validateCustomFields({ name: '홍길동', age: 20 }, requiredFields);
  assert.deepEqual(validErrors, {});

  // 5. 병합 (Merge)
  const existing = { oldKey: 'oldValue', score: 100 };
  const updated = mergeCustomFieldValues(existing, { score: 120, newKey: 'newValue' });
  assert.deepEqual(updated, {
    oldKey: 'oldValue',
    score: 120,
    newKey: 'newValue',
  });

  console.log('customFields.test.ts: all tests passed! (100% OK)');
}

run();
