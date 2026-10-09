import assert from 'node:assert/strict';
import {
  getQuestionsForIndustry,
  buildPresetPayload,
  normalizeIndustryKey,
  getStandardPresetsForIndustry,
  QuickSetupFormZodSchema,
} from './presetQuestionEngine';

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

console.log('[TEST] presetQuestionEngine ALL TESTS PASSED!');
