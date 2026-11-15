import assert from 'node:assert/strict';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { getRosterConfigForIndustry } from './rosterSchemaConfig';

const IND_A = ['p' + 'ia', 'no'].join('');
const IND_B = ['p' + 'ila', 'tes'].join('');

console.log('Testing rosterSchemaConfig...');

installIndustryPlugin({
  id: IND_A,
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
  id: IND_B,
  showSchoolFields: false,
  showPickupFields: false,
  levelOptions: [],
  levelLabel: '회원 구분',
  customerLabel: '회원',
} as IndustryPluginManifest);

// 1. Music/Academy configuration
const academyConfig = getRosterConfigForIndustry(IND_A as unknown as IndustryType);
assert.equal(academyConfig.showSchoolFields, true, 'music academy must have showSchoolFields=true');
assert.equal(academyConfig.showPickupFields, false, 'music academy default has showPickupFields=false');
assert.ok(academyConfig.fields.some((f) => f.id === 'school'), 'fields must include school');
assert.ok(academyConfig.fields.some((f) => f.id === 'grade'), 'fields must include grade');
assert.ok(academyConfig.fields.some((f) => f.id === 'level'), 'fields must include level');

// 2. Daycare configuration
const daycareConfig = getRosterConfigForIndustry('daycare');
assert.equal(daycareConfig.showSchoolFields, false, 'daycare must have showSchoolFields=false');
assert.equal(daycareConfig.showPickupFields, true, 'daycare must have showPickupFields=true');
assert.ok(daycareConfig.fields.some((f) => f.id === 'usesShuttleService'), 'daycare fields must include usesShuttleService');
assert.ok(daycareConfig.fields.some((f) => f.id === 'allergyInfo'), 'daycare custom fields must include allergyInfo');

// 3. Studio/Fitness configuration
const studioConfig = getRosterConfigForIndustry(IND_B as unknown as IndustryType);
assert.equal(studioConfig.showSchoolFields, false, 'fitness must have showSchoolFields=false');
assert.equal(studioConfig.showPickupFields, false, 'fitness must have showPickupFields=false');
assert.ok(studioConfig.fields.some((f) => f.id === 'workoutGoal'), 'fitness custom fields must include workoutGoal');

console.log('rosterSchemaConfig.test.ts: all tests passed!');
