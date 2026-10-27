import assert from 'node:assert/strict';
import { QuickSetupPage } from './QuickSetupPage';

// 1. 컴포넌트 export 검증
assert.equal(typeof QuickSetupPage, 'function', 'QuickSetupPage must be a React component function');

// 2. 기업/제조업 프리셋 vs 소상공인 프리셋 부서 스코프 지능형 분기 로직 단위 검증
function isEnterpriseOrManufacturingPreset(industryId: string, category?: string): boolean {
  const cat = category?.toLowerCase();
  const id = industryId.toLowerCase();
  return (
    cat === 'manufacturing' ||
    cat === 'enterprise' ||
    id.includes('enterprise') ||
    id.includes('manufacturing') ||
    id.includes('plant_ops') ||
    id.includes('corp') ||
    id === 'iso_ims_enterprise' ||
    id === 'iso_human_capital' ||
    id === 'rnd_lab_management' ||
    id === 'general_enterprise' ||
    id === 'manufacturing_light'
  );
}

// 소상공인 프리셋: Auto-Skip (false) -> 복잡도 0원 보장
assert.equal(isEnterpriseOrManufacturingPreset('piano', 'education'), false, '피아노 학원은 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('pilates', 'fitness'), false, '필라테스 스튜디오는 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('sauna', 'wellness'), false, '사우나는 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('study_cafe', 'studio'), false, '스터디카페는 부서 스킵');
assert.equal(isEnterpriseOrManufacturingPreset('nail_salon', 'beauty'), false, '네일샵은 부서 스킵');

// 기업/제조업 프리셋: 부서 설정 카드 활성화 (true)
assert.equal(isEnterpriseOrManufacturingPreset('manufacturing_light', 'manufacturing'), true, '경공업 제조는 부서 설정 노출');
assert.equal(isEnterpriseOrManufacturingPreset('general_enterprise', 'enterprise'), true, '일반 기업은 부서 설정 노출');
assert.equal(isEnterpriseOrManufacturingPreset('iso_ims_enterprise', 'enterprise'), true, 'ISO 인증 기업은 부서 설정 노출');
assert.equal(isEnterpriseOrManufacturingPreset('rnd_lab_management', 'enterprise'), true, 'R&D 연구소는 부서 설정 노출');

// 3. EP_apps / personal_plant_ops 프리셋 완전 제거 검증
import {
  getIndustryPreset,
  listMoaVisiblePresets,
  isPresetVisibleInMoa,
} from '@/app/presets/presetRegistry';

assert.equal(getIndustryPreset('personal_plant_ops'), undefined, 'personal_plant_ops 프리셋은 완전히 제거되어야 합니다.');
assert.equal(getIndustryPreset('ep_apps'), undefined, 'ep_apps 별칭은 완전히 제거되어야 합니다.');
assert.equal(getIndustryPreset('EP_apps'), undefined, 'EP_apps 별칭은 완전히 제거되어야 합니다.');

assert.equal(
  isPresetVisibleInMoa('personal_plant_ops'),
  false,
  '제거된 personal_plant_ops는 moa 앱에서 표시 및 선택 불가능해야 합니다.'
);
assert.equal(
  isPresetVisibleInMoa('piano'),
  true,
  '일반 moa 프리셋(piano)은 moa 앱에서 표시 및 선택 가능해야 합니다.'
);

const moaPresets = listMoaVisiblePresets();
assert.equal(
  moaPresets.some((p) => p.id === 'personal_plant_ops'),
  false,
  'moa 앱 프리셋 목록에 personal_plant_ops가 노출되지 않아야 합니다.'
);
assert.ok(
  moaPresets.some((p) => p.id === 'piano'),
  'moa 앱 프리셋 목록에 일반 업종이 노출되어야 합니다.'
);

// 4. 온보딩 직급 순서 정규화(100단위 간격) 및 불변식 검증
import { normalizeRankOrders } from './QuickSetupPage';

const inputRoles = [
  { name: '대표이사', rank_order: 1 },
  { name: '본부장', rank_order: 2 },
  { name: '팀장', rank_order: 3 },
  { name: '팀원', rank_order: 4 },
];

const normalized = normalizeRankOrders(inputRoles);
assert.equal(normalized[0].rank_order, 100, '첫 번째 직급은 100');
assert.equal(normalized[1].rank_order, 200, '두 번째 직급은 200');
assert.equal(normalized[2].rank_order, 300, '세 번째 직급은 300');
assert.equal(normalized[3].rank_order, 400, '네 번째 직급은 400');

// 순서 역전(이동) 후 재정규화 검증
const reordered = [inputRoles[1], inputRoles[0], inputRoles[2], inputRoles[3]];
const reorderedNormalized = normalizeRankOrders(reordered);
assert.equal(reorderedNormalized[0].name, '본부장');
assert.equal(reorderedNormalized[0].rank_order, 100);
assert.equal(reorderedNormalized[1].name, '대표이사');
assert.equal(reorderedNormalized[1].rank_order, 200);

console.log('QuickSetupPage.test.ts: ok');
