import assert from 'node:assert/strict';
import {
  getQuestionsForIndustry,
  buildPresetPayload,
  normalizeIndustryKey,
  getStandardPresetsForIndustry,
  QuickSetupFormZodSchema,
} from './presetQuestionEngine';
import { listIndustryPresets } from './presetRegistry';

console.log('[TEST] presetQuestionEngine suite starting...');

// 1. Industry key normalization
assert.equal(normalizeIndustryKey('PIANO_ACADEMY'), 'piano');
assert.equal(normalizeIndustryKey('piano'), 'piano');
assert.equal(normalizeIndustryKey('SAUNA'), 'sauna');
assert.equal(normalizeIndustryKey('sauna_jjimjilbang'), 'sauna');
assert.equal(normalizeIndustryKey('PILATES'), 'pilates');
assert.equal(normalizeIndustryKey('CUSTOM'), 'custom');
console.log('✓ normalizeIndustryKey passed');

// 2. getQuestionsForIndustry verification
const pianoQuestions = getQuestionsForIndustry('piano');
assert.ok(pianoQuestions.length > 0, 'Piano should have questions');
assert.ok(
  pianoQuestions.some((q) => q.capabilityId === 'seat_room'),
  'Piano should include seat_room questions'
);
assert.ok(
  pianoQuestions.some((q) => q.capabilityId === 'attendance'),
  'Piano should include attendance questions'
);

const saunaQuestions = getQuestionsForIndustry('sauna');
assert.ok(saunaQuestions.length > 0, 'Sauna should have questions');
assert.ok(
  saunaQuestions.some((q) => q.capabilityId === 'locker'),
  'Sauna should include locker questions'
);

const pilatesQuestions = getQuestionsForIndustry('pilates');
assert.ok(pilatesQuestions.length > 0, 'Pilates should have questions');
assert.ok(
  pilatesQuestions.some((q) => q.capabilityId === 'booking'),
  'Pilates should include booking questions'
);

const customQuestions = getQuestionsForIndustry('custom');
assert.equal(customQuestions.length, 0, 'Custom mode should have 0 questions');
console.log('✓ getQuestionsForIndustry passed');

// 3. Piano default payload build verification
const pianoPayload = buildPresetPayload('piano');
assert.equal(pianoPayload.industry, 'piano');
assert.equal(pianoPayload.roles.length, 3);
assert.deepEqual(
  pianoPayload.roles.map((r) => r.name),
  ['원장', '전임강사', '파트타임']
);
assert.ok(pianoPayload.rooms, 'Piano payload must have rooms');
assert.equal(pianoPayload.rooms.length, 5);
assert.equal(pianoPayload.rooms[0].name, '그랜드룸');
assert.equal(pianoPayload.rooms[0].capacity, 2);
assert.equal(pianoPayload.operating_hours.start_time, '13:00');
assert.equal(pianoPayload.operating_hours.end_time, '19:00');
assert.equal(pianoPayload.operating_hours.slot_minutes, 30);
console.log('✓ Piano default payload build passed');

// 4. Sauna locker count custom override (e.g. 80)
const saunaPayloadDefault = buildPresetPayload('sauna');
assert.equal(saunaPayloadDefault.locker_count, 50, 'Default sauna locker count should be 50');

const saunaPayloadCustom = buildPresetPayload('sauna', { locker_count: 80 });
assert.equal(saunaPayloadCustom.locker_count, 80, 'Custom locker count should override to 80');
assert.equal(saunaPayloadCustom.roles.length, 3);
assert.deepEqual(
  saunaPayloadCustom.roles.map((r) => r.name),
  ['사장', '주간 카운터', '야간 카운터']
);
assert.equal(saunaPayloadCustom.operating_hours.start_time, '05:00');
assert.equal(saunaPayloadCustom.operating_hours.end_time, '23:00');

// Test totalLockerCount alias fallback
const saunaPayloadAlias = buildPresetPayload('sauna', { totalLockerCount: 120 });
assert.equal(saunaPayloadAlias.locker_count, 120, 'totalLockerCount alias should override to 120');
console.log('✓ Sauna locker count custom override passed');

// 5. Pilates default payload build verification
const pilatesPayload = buildPresetPayload('pilates');
assert.equal(pilatesPayload.industry, 'pilates');
assert.equal(pilatesPayload.roles.length, 3);
assert.deepEqual(
  pilatesPayload.roles.map((r) => r.name),
  ['대표', '수석강사', '강사']
);
assert.ok(pilatesPayload.rooms, 'Pilates payload must have rooms');
assert.equal(pilatesPayload.rooms.length, 3);
assert.equal(pilatesPayload.rooms[0].name, '리포머룸');
assert.equal(pilatesPayload.rooms[0].capacity, 6);
assert.equal(pilatesPayload.operating_hours.start_time, '09:00');
assert.equal(pilatesPayload.operating_hours.end_time, '21:00');
assert.equal(pilatesPayload.operating_hours.slot_minutes, 50);
console.log('✓ Pilates default payload build passed');

// 6. Custom (empty canvas) mode verification
const customPayload = buildPresetPayload('custom');
assert.equal(customPayload.industry, 'custom');
assert.equal(customPayload.roles.length, 1);
assert.equal(customPayload.roles[0].name, '관리자');
assert.equal(customPayload.rooms, undefined);
assert.equal(customPayload.locker_count, undefined);
assert.equal(customPayload.operating_hours.start_time, '09:00');
assert.equal(customPayload.operating_hours.end_time, '18:00');
console.log('✓ Custom mode verification passed');

// 7. Role and room override by user
const overriddenPayload = buildPresetPayload('piano', {
  roles: [
    { name: '원장님', rank_order: 1, permissions: ['*'] },
    { name: '조교', rank_order: 2, permissions: ['attendance:checkin'] },
  ],
  rooms: [{ name: '합주실', capacity: 10 }],
});
assert.equal(overriddenPayload.roles.length, 2);
assert.equal(overriddenPayload.roles[0].name, '원장님');
assert.equal(overriddenPayload.rooms?.length, 1);
assert.equal(overriddenPayload.rooms?.[0].name, '합주실');
console.log('✓ Roles and rooms override passed');

// 8. Zod Schema validation test
const validParsed = QuickSetupFormZodSchema.safeParse({
  name: '모아 피아노 학원',
  industry: 'piano',
  locker_count: 50,
});
assert.equal(validParsed.success, true);

const invalidParsed = QuickSetupFormZodSchema.safeParse({
  name: '',
  industry: '',
});
assert.equal(invalidParsed.success, false);
console.log('✓ QuickSetupFormZodSchema validation passed');

// 9. 40-Vertical Presets dynamic provisioning verification
const studyCafePayload = buildPresetPayload('study_cafe');
assert.equal(studyCafePayload.industry, 'study_cafe');
assert.ok(studyCafePayload.roles.length >= 1, 'Study cafe should have at least 1 role');
assert.equal(studyCafePayload.locker_count, 50, 'Study cafe has locker capability');
assert.ok(studyCafePayload.rooms && studyCafePayload.rooms.length > 0, 'Study cafe should have spaces');
assert.ok(
  Array.isArray(studyCafePayload.capabilities) && studyCafePayload.capabilities.includes('seat_room'),
  'Study cafe should include seat_room capability'
);
console.log('✓ study_cafe preset provisioning passed');

const taekwondoPayload = buildPresetPayload('taekwondo');
assert.equal(taekwondoPayload.industry, 'taekwondo_academy');
assert.ok(taekwondoPayload.roles.some((r) => r.name === '관장'), 'Taekwondo should have 관장 role');
assert.ok(taekwondoPayload.roles.some((r) => r.name === '사범'), 'Taekwondo should have 사범 role');
assert.equal(taekwondoPayload.operating_hours.slot_minutes, 30, 'Taekwondo education slot 30m');
console.log('✓ taekwondo preset provisioning passed');

const hairSalonPayload = buildPresetPayload('hair_salon');
assert.equal(hairSalonPayload.industry, 'hair_salon');
assert.ok(hairSalonPayload.roles.some((r) => r.name === '원장'), 'Hair salon should have 원장 role');
assert.ok(hairSalonPayload.roles.some((r) => r.name.includes('디자이너')), 'Hair salon should have designer role');
assert.equal(hairSalonPayload.operating_hours.start_time, '10:00');
console.log('✓ hair_salon preset provisioning passed');

const rentalPayload = buildPresetPayload('equipment_rental');
assert.equal(rentalPayload.industry, 'equipment_rental');
assert.ok(
  Array.isArray(rentalPayload.capabilities) && rentalPayload.capabilities.includes('rental_equipment'),
  'Equipment rental should include rental_equipment capability'
);
console.log('✓ equipment_rental preset provisioning passed');

// 9-1. Manufacturing Light preset onboarding template verification
const mfgDefaults = getStandardPresetsForIndustry('manufacturing_light');
assert.equal(mfgDefaults.roles.length, 3, 'Manufacturing preset must define 3 roles');
assert.equal(mfgDefaults.roles[0].name, '공장장/관리자');
assert.equal(mfgDefaults.roles[1].name, '생산반장');
assert.equal(mfgDefaults.roles[2].name, '현장작업자');
assert.equal(mfgDefaults.rooms?.length, 3, 'Manufacturing preset must define 3 work lines/rooms');
assert.equal(mfgDefaults.rooms?.[0].name, '1호 가공 라인');
assert.equal(mfgDefaults.rooms?.[1].name, '2호 조립 라인');
assert.equal(mfgDefaults.rooms?.[2].name, '검사실/완제품실');
assert.equal(mfgDefaults.operating_hours.start_time, '08:00');
assert.equal(mfgDefaults.operating_hours.end_time, '17:00');
assert.equal(mfgDefaults.operating_hours.day_type, 'WEEKDAY');

const mfgPayload = buildPresetPayload('manufacturing_light');
assert.equal(mfgPayload.industry, 'manufacturing_light');
assert.ok(mfgPayload.capabilities?.includes('task_pipeline'), 'Must include task_pipeline');
assert.ok(mfgPayload.capabilities?.includes('recipe_bom'), 'Must include recipe_bom');
assert.ok(mfgPayload.capabilities?.includes('inventory'), 'Must include inventory');
assert.ok(!mfgPayload.capabilities?.includes('attendance'), 'Must NOT include small business attendance');
assert.ok(!mfgPayload.capabilities?.includes('locker'), 'Must NOT include small business locker');
console.log('✓ manufacturing_light preset onboarding template verified successfully!');

// 9-2. ISO Human Capital preset onboarding template verification
const hrDefaults = getStandardPresetsForIndustry('iso_human_capital');
assert.equal(hrDefaults.roles.length, 4, 'ISO Human capital preset must define 4 roles');
assert.equal(hrDefaults.roles[0].name, '대표이사/총괄임원');
assert.equal(hrDefaults.roles[1].name, '인사팀장/HRD');
assert.equal(hrDefaults.roles[2].name, '부서장/팀장');
assert.equal(hrDefaults.roles[3].name, '사원/팀원');
assert.equal(hrDefaults.rooms?.length, 3, 'Must define 3 rooms');
assert.equal(hrDefaults.operating_hours.start_time, '09:00');
assert.equal(hrDefaults.operating_hours.end_time, '18:00');

const hrPayload = buildPresetPayload('iso_human_capital');
assert.equal(hrPayload.industry, 'iso_human_capital');
assert.ok(hrPayload.capabilities?.includes('mbo'), 'Must include mbo');
assert.ok(hrPayload.capabilities?.includes('work_attendance_payroll'), 'Must include work_attendance_payroll');
assert.ok(hrPayload.capabilities?.includes('workplace_policy'), 'Must include workplace_policy');
assert.ok(hrPayload.capabilities?.includes('feedbacks'), 'Must include feedbacks');
assert.ok(!hrPayload.capabilities?.includes('passes'), 'Must NOT include passes');
assert.ok(!hrPayload.capabilities?.includes('locker'), 'Must NOT include locker');
console.log('✓ iso_human_capital preset onboarding template verified successfully!');

const allPresets = listIndustryPresets();
assert.ok(allPresets.length >= 40, `Expected at least 40 presets, got ${allPresets.length}`);

for (const p of allPresets) {
  const defaults = getStandardPresetsForIndustry(p.id);
  assert.ok(defaults.roles.length > 0, `Preset ${p.id} must have default roles`);
  assert.ok(defaults.operating_hours.start_time, `Preset ${p.id} must have start_time`);
  assert.ok(defaults.operating_hours.end_time, `Preset ${p.id} must have end_time`);
  assert.ok(defaults.operating_hours.slot_minutes > 0, `Preset ${p.id} must have slot_minutes`);

  const payload = buildPresetPayload(p.id);
  assert.equal(payload.industry, normalizeIndustryKey(p.id));
  assert.ok(payload.roles.length > 0);
  assert.ok(Array.isArray(payload.capabilities));
}
console.log(`✓ All ${allPresets.length} industry presets batch verified successfully!`);

// 11. getCapabilityDisplayName and OPERATION_TOOL_SETS suite
import { getCapabilityDisplayName } from '@/capabilities';
import { OPERATION_TOOL_SETS, getRecommendedToolSetsForPreset } from '@/core/presets/operationBundles';
import { CAPABILITY_IDS } from '@/capabilities/_shared/capabilityTypes';

for (const capId of CAPABILITY_IDS) {
  const name = getCapabilityDisplayName(capId);
  assert.ok(name && name.length > 0, `Capability ${capId} must have a valid display name`);
  assert.notEqual(name, '', `Capability ${capId} display name cannot be empty`);
}
console.log(`✓ All ${CAPABILITY_IDS.length} capabilities return non-empty display name`);

assert.equal(OPERATION_TOOL_SETS.length, 12, 'Expected 12 operation tool sets');
for (const p of allPresets) {
  const recommended = getRecommendedToolSetsForPreset(p.id);
  assert.ok(recommended.length > 0, `Preset ${p.id} should have at least 1 recommended tool set`);
}
console.log(`✓ All ${allPresets.length} presets have recommended tool sets in catalog`);

console.log('[TEST] presetQuestionEngine ALL TESTS PASSED!');


