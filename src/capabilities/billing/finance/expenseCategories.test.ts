/**
 * 지출 카테고리 선택은 업종 플러그인 훅이 소유한다.
 * 실행: npx tsx src/capabilities/billing/finance/expenseCategories.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { pianoExpenseCategories } from '@/industries/piano/expenseCategories';
import { pilatesExpenseCategories } from '@/industries/pilates/expenseCategories';
import { gymExpenseCategories } from '@/industries/gym/expenseCategories';
import { daycareExpenseCategories } from '@/industries/daycare/expenseCategories';
import { skinExpenseCategories } from '@/industries/skin/expenseCategories';
import { retailExpenseCategories } from '@/industries/retail/expenseCategories';
import { bathExpenseCategories } from '@/industries/bath/expenseCategories';
import { getExpenseCategories } from './categories';

installIndustryPlugins([
  { id: 'piano', getExpenseCategories: pianoExpenseCategories },
  { id: 'pilates', getExpenseCategories: pilatesExpenseCategories },
  { id: 'gym', getExpenseCategories: gymExpenseCategories },
  { id: 'daycare', getExpenseCategories: daycareExpenseCategories },
  { id: 'skin_clinic', getExpenseCategories: skinExpenseCategories },
  { id: 'retail', getExpenseCategories: retailExpenseCategories },
  { id: 'sauna_jjimjilbang', getExpenseCategories: bathExpenseCategories },
] as IndustryPluginManifest[]);

const COMMON: [string, string][] = [
  ['rent', '임대료'],
  ['utility', '관리비/공과금'],
  ['maintenance', '시설 유지보수'],
  ['salary', '인건비/급여'],
  ['supplies', '소모품/비품'],
  ['marketing', '홍보/마케팅'],
  ['insurance', '보험'],
  ['tax', '세금/공과'],
  ['other', '기타'],
];

const PIANO: [string, string][] = [
  ['piano_tuning', '피아노 조율/수리'],
  ['textbook', '교재/악보 구입'],
  ['snacks', '간식/다과'],
  ['teacher_salary', '강사료'],
];

const DAYCARE: [string, string][] = [
  ['meals', '급식/간식'],
  ['toys', '교구/완구'],
  ['field_trip', '체험학습/행사'],
  ['teacher_salary', '교사 인건비'],
];

const SKIN: [string, string][] = [
  ['products', '관리 용품'],
  ['cleaning', '청소/위생'],
  ['instructor_fee', '관리사 수당'],
];

const PILATES: [string, string][] = [
  ['equipment', '기구/장비'],
  ['cleaning', '청소/위생'],
  ['instructor_fee', '강사료'],
];

const GYM: [string, string][] = [
  ['equipment', '운동 용품/장비'],
  ['uniform', '유니폼/복장'],
  ['competition', '대회/행사 비용'],
  ['instructor_fee', '강사료'],
];

function pairs(industry: string): [string, string][] {
  return getExpenseCategories(industry).map((item) => [item.value, item.label]);
}

function expectCategories(industry: string, extras: [string, string][]) {
  assert.deepEqual(pairs(industry), [...COMMON, ...extras], industry);
}

expectCategories('piano', PIANO);
expectCategories('daycare', DAYCARE);
expectCategories('skin_clinic', SKIN);
expectCategories('pilates', PILATES);
expectCategories('gym', GYM);
expectCategories('taekwondo', GYM);
expectCategories('preschool', DAYCARE);
expectCategories('kindergarten', DAYCARE);
expectCategories('', PIANO);
expectCategories('retail', PIANO);
expectCategories('sauna_jjimjilbang', PIANO);
expectCategories('sauna_jjimjbang', PIANO);

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');
const categoriesSrc = readFileSync(join(here, 'categories.ts'), 'utf8');
const fn = categoriesSrc.slice(categoriesSrc.indexOf('export function getExpenseCategories'));
assert.doesNotMatch(fn, /industry\s*===/);
assert.doesNotMatch(fn, /is[A-Z][A-Za-z]*Industry/);

const wiring: [string, RegExp][] = [
  ['industries/piano/plugin.ts', /getExpenseCategories:\s*pianoExpenseCategories/],
  ['industries/pilates/plugin.ts', /getExpenseCategories:\s*pilatesExpenseCategories/],
  ['industries/gym/plugin.ts', /getExpenseCategories:\s*gymExpenseCategories/],
  ['industries/daycare/plugin.ts', /getExpenseCategories:\s*daycareExpenseCategories/],
  ['industries/skin/plugin.ts', /getExpenseCategories:\s*skinExpenseCategories/],
  ['industries/retail/plugin.ts', /getExpenseCategories:\s*retailExpenseCategories/],
  ['industries/bath/plugin.ts', /getExpenseCategories:\s*bathExpenseCategories/],
  ['core/industry/genericPlugin.ts', /getExpenseCategories:\s*\(\)\s*=>\s*defaultExpenseCategories\(\)/],
];
for (const [rel, pattern] of wiring) {
  assert.match(readFileSync(join(srcRoot, rel), 'utf8'), pattern, rel);
}

console.log('expenseCategories.test.ts: ok');
