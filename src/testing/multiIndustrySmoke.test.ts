/**
 * Moa-v2 7대 산업군 대표 업종 멀티-테넌시 스모크 불변성 테스트
 *
 * 1. 교육: piano / academy
 * 2. 피트니스: gym / pilates
 * 3. 뷰티/헬스케어: skin_clinic / nail
 * 4. 공간/대여: study_cafe / shared_office
 * 5. 돌봄/양육: daycare / pet_kindergarten
 * 6. 레저/스포츠: indoor_golf / swimming
 * 7. 리테일/기타: retail / floral
 *
 * 실행: npx tsx src/testing/multiIndustrySmoke.test.ts
 */
import assert from 'node:assert/strict';
import { getIndustryDefinition, type IndustryType } from '../core/industry/catalog';
import { getTerminologyDictionary } from '../core/terminology/dictionaries';
import { translateTerm } from '../core/terminology/translate';
import {
  createTestOrganization,
  createTestCustomer,
  createTestClass,
  createTestSessionPass,
  createTestBooking,
  resetFactorySequence,
} from './factories/entityFactory';
import { getIndustryPreset } from '../app/presets/presetRegistry';

interface IndustryTestCase {
  sector: string;
  industryId: IndustryType;
  expectedMemberTerm: string;
  expectedStaffTerm: string;
}

const SECTOR_REPRESENTATIVE_CASES: IndustryTestCase[] = [
  {
    sector: '1. 교육 (Education - Piano)',
    industryId: 'piano',
    expectedMemberTerm: '학생',
    expectedStaffTerm: '선생님',
  },
  {
    sector: '1. 교육 (Education - Academy)',
    industryId: 'academy',
    expectedMemberTerm: '학생',
    expectedStaffTerm: '선생님',
  },
  {
    sector: '2. 피트니스 (Fitness - Gym)',
    industryId: 'gym',
    expectedMemberTerm: '회원',
    expectedStaffTerm: '강사',
  },
  {
    sector: '2. 피트니스 (Fitness - Pilates)',
    industryId: 'pilates',
    expectedMemberTerm: '회원',
    expectedStaffTerm: '강사',
  },
  {
    sector: '3. 뷰티/헬스케어 (Beauty - Skin)',
    industryId: 'skin_clinic',
    expectedMemberTerm: '고객',
    expectedStaffTerm: '관리사',
  },
  {
    sector: '3. 뷰티/헬스케어 (Beauty - Nail)',
    industryId: 'nail_salon',
    expectedMemberTerm: '고객',
    expectedStaffTerm: '관리사',
  },
  {
    sector: '4. 공간/대여 (Space - Photo Studio)',
    industryId: 'photo_studio',
    expectedMemberTerm: '고객',
    expectedStaffTerm: '매니저',
  },
  {
    sector: '4. 공간/대여 (Space - Craft Workshop)',
    industryId: 'craft_workshop',
    expectedMemberTerm: '고객',
    expectedStaffTerm: '매니저',
  },
  {
    sector: '5. 돌봄/양육 (Care - Daycare)',
    industryId: 'daycare',
    expectedMemberTerm: '원아',
    expectedStaffTerm: '교사',
  },
  {
    sector: '5. 돌봄/양육 (Care - Pet Hotel)',
    industryId: 'pet_hotel',
    expectedMemberTerm: '보호자',
    expectedStaffTerm: '관리사',
  },
  {
    sector: '6. 레저/스포츠 (Leisure - Golf)',
    industryId: 'golf_lesson',
    expectedMemberTerm: '회원',
    expectedStaffTerm: '강사',
  },
  {
    sector: '6. 레저/스포츠 (Leisure - Swimming)',
    industryId: 'swim_school',
    expectedMemberTerm: '회원',
    expectedStaffTerm: '강사',
  },
  {
    sector: '7. 리테일/F&B (Retail)',
    industryId: 'retail',
    expectedMemberTerm: '고객',
    expectedStaffTerm: '직원',
  },
  {
    sector: '7. 리테일/F&B (Cafe)',
    industryId: 'cafe',
    expectedMemberTerm: '고객',
    expectedStaffTerm: '직원',
  },
];

async function runMultiIndustrySmokeTests() {
  console.log('🧪 [Multi-Industry Smoke] 7대 산업군 대표 업종 멀티-테넌시 스모크 테스트 시작...\n');

  resetFactorySequence();

  for (const testCase of SECTOR_REPRESENTATIVE_CASES) {
    const { sector, industryId, expectedMemberTerm, expectedStaffTerm } = testCase;

    // 1. 카탈로그 정의 무결성 검증
    const def = getIndustryDefinition(industryId);
    assert.ok(def, `[${sector}] ${industryId} 카탈로그 정의가 존재해야 합니다.`);
    assert.equal(def.id, industryId, `[${sector}] 정의의 id가 일치해야 합니다.`);

    // 2. 프리셋 해결 검증
    const preset = getIndustryPreset(industryId);
    assert.ok(preset, `[${sector}] ${industryId} 프리셋이 성공적으로 해석되어야 합니다.`);
    assert.ok(preset.capabilities.length > 0, `[${sector}] 프리셋은 최소 1개 이상의 Capability를 보유해야 합니다.`);

    // 3. 다형적 용어(Polymorphic Labels) 결정론적 검증
    const dict = getTerminologyDictionary(industryId);
    const memberTerm = translateTerm(dict, 'customer');
    const staffTerm = translateTerm(dict, 'staff');

    assert.ok(
      memberTerm.includes(expectedMemberTerm),
      `[${sector}] ${industryId} 회원 용어는 '${expectedMemberTerm}'을 포함해야 합니다. (실제: ${memberTerm})`
    );
    assert.ok(
      staffTerm.includes(expectedStaffTerm),
      `[${sector}] ${industryId} 직원 용어는 '${expectedStaffTerm}'을 포함해야 합니다. (실제: ${staffTerm})`
    );

    // 4. 테스트 팩토리 격리 인스턴스 생성 검증
    const org = createTestOrganization({ industry: industryId });
    assert.equal(org.settings?.industry, industryId);

    const customer = createTestCustomer();
    assert.ok(customer.id.startsWith('cust_test_'));

    const cls = createTestClass();
    assert.ok(cls.id.startsWith('class_test_'));

    const pass = createTestSessionPass({ customerId: customer.id });
    assert.equal(pass.customerId, customer.id);

    const booking = createTestBooking({ customerId: customer.id });
    assert.equal(booking.customerId, customer.id);

    console.log(`  ✔ [${sector}] ${industryId}: 프리셋(${preset.capabilities.length} Caps), 용어('${memberTerm}'/'${staffTerm}'), 샌드박스 팩토리 통과`);
  }

  console.log('\n✨ [Multi-Industry Smoke] 7대 산업군 14개 대표 업종 스모크 불변성 테스트 100% 통과!');
}

runMultiIndustrySmokeTests();
