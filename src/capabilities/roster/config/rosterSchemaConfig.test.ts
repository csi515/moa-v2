import assert from 'node:assert/strict';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { getRosterConfigForIndustry } from './rosterSchemaConfig';

console.log('Testing rosterSchemaConfig...');

installIndustryPlugin({
  id: 'piano',
  showSchoolFields: true,
  showPickupFields: false,
  levelOptions: ['바이엘 상', '바이엘 하', '체르니 100'],
  levelLabel: '레슨 단계',
  customerLabel: '원생',
} as IndustryPluginManifest);

installIndustryPlugin({
  id: 'daycare',
  showSchoolFields: false,
  showPickupFields: true,
  levelOptions: [],
  levelLabel: '반 구분',
  customerLabel: '원아',
} as IndustryPluginManifest);

installIndustryPlugin({
  id: 'pilates',
  showSchoolFields: false,
  showPickupFields: false,
  levelOptions: [],
  levelLabel: '회원 구분',
  customerLabel: '회원',
} as IndustryPluginManifest);

// 1. Piano configuration
const pianoConfig = getRosterConfigForIndustry('piano');
assert.equal(pianoConfig.showSchoolFields, true, 'piano must have showSchoolFields=true');
assert.equal(pianoConfig.showPickupFields, false, 'piano default has showPickupFields=false');
assert.ok(pianoConfig.fields.some((f) => f.id === 'school'), 'piano fields must include school');
assert.ok(pianoConfig.fields.some((f) => f.id === 'grade'), 'piano fields must include grade');
assert.ok(pianoConfig.fields.some((f) => f.id === 'level'), 'piano fields must include level');

// 2. Daycare configuration
const daycareConfig = getRosterConfigForIndustry('daycare');
assert.equal(daycareConfig.showSchoolFields, false, 'daycare must have showSchoolFields=false');
assert.equal(daycareConfig.showPickupFields, true, 'daycare must have showPickupFields=true');
assert.ok(daycareConfig.fields.some((f) => f.id === 'usesShuttleService'), 'daycare fields must include usesShuttleService');
assert.ok(daycareConfig.fields.some((f) => f.id === 'allergyInfo'), 'daycare custom fields must include allergyInfo');

// 3. Pilates configuration
const pilatesConfig = getRosterConfigForIndustry('pilates');
assert.equal(pilatesConfig.showSchoolFields, false, 'pilates must have showSchoolFields=false');
assert.equal(pilatesConfig.showPickupFields, false, 'pilates must have showPickupFields=false');
assert.ok(pilatesConfig.fields.some((f) => f.id === 'workoutGoal'), 'pilates custom fields must include workoutGoal');

console.log('rosterSchemaConfig.test.ts: all tests passed!');
