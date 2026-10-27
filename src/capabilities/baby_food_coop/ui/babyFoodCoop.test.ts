/**
 * Baby Food Coop UI Logic — 단위 불변식 테스트
 * 실행: npx tsx src/capabilities/baby_food_coop/ui/babyFoodCoop.test.ts
 */
import assert from 'node:assert/strict';
import {
  extractAllergyTags,
  type BabyProfile,
} from './BabyProfileCard';
import {
  calculateBabyAge,
  getWeaningStageGuide,
  calculateSettlement,
} from '@/domain/babyFood/babyFoodLogic';

function testExtractAllergyTags(): void {
  const babyWithAllergies: BabyProfile = {
    id: 'test-1',
    name: '아기A',
    birthDate: '2026-03-15',
    crm_tags: ['초기이유식', '계란알레르기', '소고기선호'],
    allergies: ['우유알러지'],
  };

  const { allergyTags, generalTags } = extractAllergyTags(babyWithAllergies);

  // 알레르기 태그 검증
  assert.ok(
    allergyTags.includes('계란알레르기'),
    'crm_tags의 계란알레르기가 감지되어야 함'
  );
  assert.ok(
    allergyTags.includes('우유알러지'),
    'allergies의 우유알러지가 감지되어야 함'
  );
  assert.equal(allergyTags.length, 2, '알레르기 태그는 총 2개');

  // 일반 태그 검증
  assert.ok(
    generalTags.includes('초기이유식'),
    '초기이유식은 일반 태그로 분류'
  );
  assert.ok(
    generalTags.includes('소고기선호'),
    '소고기선호는 일반 태그로 분류'
  );

  // 알레르기가 없는 아기
  const normalBaby: BabyProfile = {
    id: 'test-2',
    name: '아기B',
    birthDate: '2026-05-10',
    crm_tags: ['완료기', '식욕왕성'],
    allergies: [],
  };
  const normalRes = extractAllergyTags(normalBaby);
  assert.equal(normalRes.allergyTags.length, 0);
  assert.equal(normalRes.generalTags.length, 2);

  console.log('✔ extractAllergyTags tests passed.');
}

function testCardAgeAndStageBinding(): void {
  const baseDate = '2026-10-25';

  // 1. 생후 7개월 중기 아기
  const baby7m: BabyProfile = {
    id: 'b-7m',
    name: '지우',
    birthDate: '2026-03-25',
  };
  const months7 = calculateBabyAge(baby7m.birthDate, baseDate);
  assert.equal(months7, 7);
  const guide7 = getWeaningStageGuide(months7);
  assert.equal(guide7.stageKey, 'middle');
  assert.equal(guide7.stageName, '중기');

  // 2. 생후 4개월 초기 아기
  const baby4m: BabyProfile = {
    id: 'b-4m',
    name: '민준',
    birthDate: '2026-06-25',
  };
  const months4 = calculateBabyAge(baby4m.birthDate, baseDate);
  assert.equal(months4, 4);
  const guide4 = getWeaningStageGuide(months4);
  assert.equal(guide4.stageKey, 'early');
  assert.equal(guide4.stageName, '초기');

  // 3. 생후 13개월 완료기 아기
  const baby13m: BabyProfile = {
    id: 'b-13m',
    name: '도윤',
    birthDate: '2025-09-25',
  };
  const months13 = calculateBabyAge(baby13m.birthDate, baseDate);
  assert.equal(months13, 13);
  const guide13 = getWeaningStageGuide(months13);
  assert.equal(guide13.stageKey, 'complete');
  assert.equal(guide13.stageName, '완료기');

  console.log('✔ cardAgeAndStageBinding tests passed.');
}

function testSettlementCalculationIntegration(): void {
  // 5명 참여, 37,000원 재료비
  const result = calculateSettlement(37000, 5);
  assert.equal(result.perPersonAmount, 7400);
  assert.equal(result.remainderAmount, 0);
  assert.equal(result.formattedPerPerson, '7,400원');

  // 3명 참여, 50,000원 재료비 (16,666원씩, 2원 남음)
  const result2 = calculateSettlement(50000, 3);
  assert.equal(result2.perPersonAmount, 16666);
  assert.equal(result2.remainderAmount, 2);
  assert.equal(16666 * 3 + 2, 50000);
  assert.equal(result2.formattedPerPerson, '16,666원');
  assert.equal(result2.formattedRemainder, '2원');

  console.log('✔ settlementCalculationIntegration tests passed.');
}

function runAll(): void {
  console.log('=== [BabyFoodCoop UI Logic] Test Start ===');
  testExtractAllergyTags();
  testCardAgeAndStageBinding();
  testSettlementCalculationIntegration();
  console.log('=== [BabyFoodCoop UI Logic] All Tests Passed! ===');
}

runAll();
