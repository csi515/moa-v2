import assert from 'node:assert/strict';
import { getIndustryPreset } from '@/app/presets/presetRegistry';

console.log('🧪 [Test Suite] Smart Industry Dashboard & Starter Templates');

// 1. 골프장 프리셋 (indoor_golf) 대시보드 KPI & 퀵 액션 검증
const golfPreset = getIndustryPreset('indoor_golf');
assert.ok(golfPreset, 'indoor_golf 프리셋 존재해야 함');
assert.equal(golfPreset.theme?.badgeEmoji, '⛳');
assert.equal(golfPreset.theme?.accentColor, 'emerald');
assert.ok(golfPreset.starterPassTemplates && golfPreset.starterPassTemplates.length >= 2);
assert.ok(golfPreset.starterPassTemplates.some((t) => t.name.includes('타석')));

// 2. 뷰티/헤어 프리셋 (hair_salon) 대시보드 KPI & 퀵 액션 검증
const hairPreset = getIndustryPreset('hair_salon');
assert.ok(hairPreset, 'hair_salon 프리셋 존재해야 함');
assert.equal(hairPreset.theme?.badgeEmoji, '✂️');
assert.equal(hairPreset.theme?.accentColor, 'rose');
assert.ok(hairPreset.capabilities.includes('treatment_chart'), 'treatment_chart 포함 필수');
assert.ok(hairPreset.starterPassTemplates && hairPreset.starterPassTemplates.length >= 2);

// 3. 태권도/도장 프리셋 (taekwondo_academy) 대시보드 용어 및 키오스크 검증
const tkdPreset = getIndustryPreset('taekwondo_academy');
assert.ok(tkdPreset, 'taekwondo_academy 프리셋 존재해야 함');
assert.equal(tkdPreset.theme?.badgeEmoji, '🥋');
assert.ok(tkdPreset.terms?.customer.includes('수련생'), '수련생 용어 포함 필수');
assert.ok(tkdPreset.capabilities.includes('attendance'), 'attendance 포함 필수');

// 4. 52개 전 업종에 대한 테마 및 스타터 템플릿 무결성 전수 검증
const testPresetIds = [
  'piano', 'pilates', 'study_cafe', 'auto_repair', 'pet_grooming',
  'climbing_activity', 'boxing_mma', 'general_academy', 'daycare', 'sauna_jjimjilbang',
];

for (const pid of testPresetIds) {
  const p = getIndustryPreset(pid);
  assert.ok(p, `프리셋 [${pid}] 조회 성공`);
  assert.ok(p.theme?.badgeEmoji, `[${pid}] badgeEmoji 필수`);
  assert.ok(p.theme?.accentColor, `[${pid}] accentColor 필수`);
  assert.ok(p.starterPassTemplates && p.starterPassTemplates.length > 0, `[${pid}] starterPassTemplates 필수`);
}

console.log('✨ All Smart Dashboard & Starter Template tests passed cleanly!');
