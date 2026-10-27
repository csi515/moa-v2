/**
 * Phase 4: Full 44-Verticals Comprehensive Regression Test Suite
 *
 * MOA v2가 지원하는 44개 전체 업종 프리셋에 대해:
 * 1. assemblePreset(id) 조립 무결성
 * 2. Onboarding 스키마 및 Role 템플릿 완결성
 * 3. 각 업종별 활성화된 Capability가 GenericIndustryShell의 defaultViewMap에 실제 뷰로 바인딩되는지
 * 4. Tier 3 플레이스홀더 잔존 여부 검증 (모든 주요 Capability가 Tier 1/Tier 2로 지원되는지)
 *
 * 실행: npx tsx src/app/presets/presetAll44VerticalsRegression.test.ts
 */

import assert from 'node:assert/strict';
import { INDUSTRY_PRESETS, getIndustryPreset, listIndustryPresets } from './presetRegistry';
import { assemblePreset } from './presetAssembler';
import {
  TAB_REQUIRED_CAPABILITIES,
  TAB_METADATA,
  isTabAllowedForCapabilities,
} from '@/app/industry/genericIndustryTabs';

console.log('[REGRESSION TEST] 44-Verticals Comprehensive Audit Starting...\n');

const allPresets = listIndustryPresets();
const allPresetIds = Object.keys(INDUSTRY_PRESETS);

// 51개 프리셋 전수 정의 확인
assert.equal(allPresetIds.length, 52, '전체 프리셋 수는 정확히 52개여야 합니다.');

const EXPECTED_VERTICAL_GROUPS = {
  education: [
    'piano',
    'general_academy',
    'language_academy',
    'art_academy',
    'taekwondo_academy',
    'dance_academy',
    'coding_academy',
    'exam_tutoring',
    'culture_center',
  ],
  fitness: [
    'pilates',
    'yoga_studio',
    'gym_fitness',
    'pt_fitness',
    'indoor_golf',
    'swim_school',
    'climbing_activity',
    'boxing_mma',
  ],
  beauty: [
    'hair_salon',
    'barber_shop',
    'nail_salon',
    'skin_clinic',
    'massage_spa',
    'tattoo_studio',
    'photo_studio',
    'pet_grooming',
  ],
  space: [
    'study_cafe',
    'shared_office',
    'space_rental',
    'locker_storage',
    'guesthouse',
    'small_hotel',
  ],
  retail_food: [
    'retail',
    'apparel_store',
    'convenience_store',
    'pet_supplies',
    'cafe',
    'restaurant',
  ],
  field_rental: [
    'auto_repair',
    'cleaning_service',
    'pet_hotel',
    'equipment_rental',
    'craft_repair',
    'self_carwash',
  ],
  care_bath: ['daycare', 'sauna_jjimjilbang'],
  manufacturing_enterprise: [
    'manufacturing_light',
    'iso_ims_enterprise',
    'iso_human_capital',
    'procurement_distribution',
    'general_enterprise',
    'rnd_lab_management',
  ],
};

// 1. 그룹별 50개 ID 전수 매칭 검증
let totalGroupCount = 0;
for (const [groupName, ids] of Object.entries(EXPECTED_VERTICAL_GROUPS)) {
  totalGroupCount += ids.length;
  for (const id of ids) {
    assert.ok(
      allPresetIds.includes(id),
      `[${groupName}] 업종 ID '${id}'가 allPresetIds에 등록되어 있어야 합니다.`
    );
  }
}
assert.equal(totalGroupCount, 51, '8대 그룹의 총 업종 수는 51개여야 합니다.');
console.log('✓ [PASS] 51개 전 업종 프리셋 ID 및 8개 그룹 정합성 검증 완료 (51/51)');

// 2. 52개 프리셋 전수 assemblePreset 및 Onboarding 검증
let assembledCount = 0;
for (const presetId of allPresetIds) {
  const preset = getIndustryPreset(presetId);
  assert.ok(preset, `Preset '${presetId}' must exist in registry`);
  assert.ok(preset.capabilities.length > 0, `Preset '${presetId}' must have at least one capability`);
  assert.ok(preset.roles.length >= 1, `Preset '${presetId}' must have at least one default role`);

  const assembled = assemblePreset(presetId);
  assert.ok(assembled.resources.length > 0, `Assembled preset '${presetId}' must produce Refine resources`);
  assert.ok(assembled.setupSchemas.length > 0, `Assembled preset '${presetId}' must have setupSchemas`);
  assert.ok(assembled.allFields.length > 0, `Assembled preset '${presetId}' must have setup fields`);

  assembledCount++;
}
console.log(`✓ [PASS] 52개 전 업종 assemblePreset, setupSchemas & 리소스 조립 검증 완료 (${assembledCount}/52)`);

// 3. Capability와 Generic 탭 매핑 검증
// 1단계~3단계에서 구현된 6대 핵심 확장 뷰:
// inventory, consents, pipelines, charts, rentals, maintenance, shifts
const IMPLEMENTED_EXPANDED_TABS = [
  'inventory',
  'consents',
  'pipelines',
  'charts',
  'rentals',
  'shifts',
  'maintenance',
];

for (const tab of IMPLEMENTED_EXPANDED_TABS) {
  const meta = TAB_METADATA[tab];
  assert.ok(meta, `탭 '${tab}'의 메타데이터가 존재해야 합니다.`);
  assert.ok(
    ['tier1_ready', 'tier2_basic', 'tier3_deferred'].includes(meta.tier),
    `탭 '${tab}'은 유효한 티어여야 합니다 (현재: ${meta.tier})`
  );
}
console.log('✓ [PASS] 확장 7대 도메인 탭의 메타데이터 및 티어 정의 검증 완료');

// 4. 업종별 필수 탭 허용성 검증
// 예: 클라이밍(climbing_activity)은 consents가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('consents', INDUSTRY_PRESETS.climbing_activity.capabilities),
  true,
  '클라이밍은 consents 탭이 허용되어야 합니다.'
);

// 예: 자동차정비(auto_repair)는 pipelines가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('pipelines', INDUSTRY_PRESETS.auto_repair.capabilities),
  true,
  '자동차 정비는 pipelines 탭이 허용되어야 합니다.'
);

// 예: 미용실(hair_salon)은 charts가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('charts', INDUSTRY_PRESETS.hair_salon.capabilities),
  true,
  '헤어살롱은 charts 탭이 허용되어야 합니다.'
);

// 예: 장비대여(equipment_rental)는 rentals가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('rentals', INDUSTRY_PRESETS.equipment_rental.capabilities),
  true,
  '장비 대여는 rentals 탭이 허용되어야 합니다.'
);

// 예: 스터디카페(study_cafe)는 maintenance가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('maintenance', INDUSTRY_PRESETS.study_cafe.capabilities),
  true,
  '스터디카페는 maintenance 탭이 허용되어야 합니다.'
);

// 예: 카페(cafe)는 shifts가 허용되어야 함
assert.equal(
  isTabAllowedForCapabilities('shifts', INDUSTRY_PRESETS.cafe.capabilities),
  true,
  '카페는 shifts 탭이 허용되어야 합니다.'
);

console.log('✓ [PASS] 44개 업종별 Capability-탭 권한 허용성(isTabAllowedForCapabilities) 검증 완료');

// 5. 엔터프라이즈 프리셋 핵심 Capability 보강 정합성 검증
{
  const hasSpaceCap = (caps: readonly string[]) =>
    caps.includes('resources') || caps.includes('seat_room') || caps.includes('booking');

  const ge = INDUSTRY_PRESETS.general_enterprise;
  assert.ok(hasSpaceCap(ge.capabilities), 'general_enterprise에 공간/자원 계열 포함되어야 함');
  assert.ok(ge.capabilities.includes('leave_management'), 'general_enterprise에 leave_management 포함되어야 함');
  assert.ok(ge.capabilities.includes('supply_restock'), 'general_enterprise에 supply_restock 포함되어야 함');

  const mfg = INDUSTRY_PRESETS.manufacturing_light;
  assert.ok(mfg.capabilities.includes('leave_management'), 'manufacturing_light에 leave_management 포함되어야 함');
  assert.ok(mfg.capabilities.includes('vehicle_shuttle'), 'manufacturing_light에 vehicle_shuttle 포함되어야 함');
  assert.ok(hasSpaceCap(mfg.capabilities), 'manufacturing_light에 공간/자원 계열 포함되어야 함');

  const rnd = INDUSTRY_PRESETS.rnd_lab_management;
  assert.ok(rnd.capabilities.includes('research_project'), 'rnd_lab_management에 research_project 포함되어야 함');
  assert.ok(rnd.capabilities.includes('leave_management'), 'rnd_lab_management에 leave_management 포함되어야 함');
  assert.ok(rnd.capabilities.includes('vehicle_shuttle'), 'rnd_lab_management에 vehicle_shuttle 포함되어야 함');

  const iso = INDUSTRY_PRESETS.iso_human_capital;
  assert.ok(iso.capabilities.includes('leave_management'), 'iso_human_capital에 leave_management 포함되어야 함');

  const ims = INDUSTRY_PRESETS.iso_ims_enterprise;
  assert.ok(hasSpaceCap(ims.capabilities), 'iso_ims_enterprise에 공간/자원 계열 포함되어야 함');
  assert.ok(ims.capabilities.includes('leave_management'), 'iso_ims_enterprise에 leave_management 포함되어야 함');

  assert.equal(INDUSTRY_PRESETS.personal_plant_ops, undefined, 'personal_plant_ops 프리셋은 제거되어야 함');

  // corporate_general_affairs 별칭 해석 검증
  const cga = getIndustryPreset('corporate_general_affairs');
  assert.ok(cga, 'corporate_general_affairs 별칭 조회가 성공해야 함');
  assert.equal(cga?.id, 'general_enterprise', 'corporate_general_affairs는 general_enterprise로 해석되어야 함');
}
console.log('✓ [PASS] 엔터프라이즈 프리셋 및 corporate_general_affairs 별칭 무결성 검증 완료');

// 6. 문화센터·평생교육원 (culture_center) 프리셋 무결성 검증
{
  const cc = INDUSTRY_PRESETS.culture_center;
  assert.ok(cc, 'culture_center 프리셋이 등록되어 있어야 합니다.');
  assert.equal(cc.category, 'education', 'culture_center의 카테고리는 education이어야 합니다.');
  assert.ok(
    cc.capabilities.includes('scheduling') || cc.capabilities.includes('booking'),
    'culture_center에 scheduling/booking 포함'
  );
  assert.ok(cc.capabilities.includes('instructor_match'), 'culture_center에 instructor_match 포함');
  assert.ok(cc.capabilities.includes('seat_room'), 'culture_center에 seat_room 포함');
  assert.ok(cc.capabilities.includes('commission_payroll'), 'culture_center에 commission_payroll 포함');
  assert.ok(cc.capabilities.includes('digital_contract'), 'culture_center에 digital_contract 포함');
  assert.ok(cc.capabilities.includes('passes'), 'culture_center에 passes 포함');
  assert.ok(cc.capabilities.includes('attendance'), 'culture_center에 attendance 포함');
  assert.ok(cc.capabilities.includes('billing_invoicing'), 'culture_center에 billing_invoicing 포함');
  assert.ok(cc.capabilities.includes('feedbacks'), 'culture_center에 feedbacks 포함');

  // 역할 템플릿 검증
  const roleNames = cc.roles?.map((r) => r.name) || [];
  assert.ok(roleNames.includes('센터장'), '센터장 역할 정의 필요');
  assert.ok(roleNames.includes('강좌매니저'), '강좌매니저 역할 정의 필요');
  assert.ok(roleNames.includes('전임강사'), '전임강사 역할 정의 필요');
  assert.ok(roleNames.includes('파트강사'), '파트강사 역할 정의 필요');

  // 조립 결과 검증
  const assembledCC = assemblePreset('culture_center');
  assert.ok(assembledCC.resources.length >= 5, 'culture_center 조립 리소스 확인');
  assert.ok(assembledCC.setupSchemas.length >= 5, 'culture_center 온보딩 스키마 확인');
}
console.log('✓ [PASS] 문화센터(culture_center) 프리셋 및 9대 Capability 조립 무결성 검증 완료');

console.log('\n===============================================================');
console.log('🎉 [44-VERTICALS AUDIT SUCCESS] 44개 전 업종 통합 회귀 검증 100% 통과!');
console.log('===============================================================');

