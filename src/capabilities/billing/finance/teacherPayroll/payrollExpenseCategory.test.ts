/**
 * 강사 정산 지출 카테고리는 업종 플러그인 훅이 소유한다.
 * 기존 하드코딩과 같은 문자열을 유지한다.
 * 실행: npx tsx src/capabilities/billing/finance/teacherPayroll/payrollExpenseCategory.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import type { Teacher } from '@/types';
import { pianoPayrollExpenseCategory } from '@/industries/piano/payrollExpenseCategory';
import { pilatesPayrollExpenseCategory } from '@/industries/pilates/payrollExpenseCategory';
import { gymPayrollExpenseCategory } from '@/industries/gym/payrollExpenseCategory';
import { daycarePayrollExpenseCategory } from '@/industries/daycare/payrollExpenseCategory';
import { skinPayrollExpenseCategory } from '@/industries/skin/payrollExpenseCategory';
import {
  DEFAULT_PAYROLL_EXPENSE_CATEGORY,
  buildPayrollExpenseDraft,
  getPayrollExpenseCategory,
} from './expenseDraft';

installIndustryPlugins([
  { id: 'piano', getPayrollExpenseCategory: pianoPayrollExpenseCategory },
  { id: 'pilates', getPayrollExpenseCategory: pilatesPayrollExpenseCategory },
  {
    id: 'gym',
    aliases: ['taekwondo'],
    getPayrollExpenseCategory: gymPayrollExpenseCategory,
  },
  { id: 'daycare', getPayrollExpenseCategory: daycarePayrollExpenseCategory },
  { id: 'skin_clinic', getPayrollExpenseCategory: skinPayrollExpenseCategory },
  { id: 'retail' },
  { id: 'sauna_jjimjilbang', aliases: ['sauna_jjimjbang'] },
] as IndustryPluginManifest[]);

const expected: [string | null | undefined, string][] = [
  ['pilates', 'instructor_fee'],
  ['skin_clinic', 'instructor_fee'],
  ['gym', 'instructor_fee'],
  ['taekwondo', 'instructor_fee'],
  ['daycare', 'teacher_salary'],
  ['piano', 'teacher_salary'],
  ['preschool', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['kindergarten', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['retail', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['sauna_jjimjilbang', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['sauna_jjimjbang', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['academy', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['taekwondo_academy', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['not_a_real_industry', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  ['  ', DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  [null, DEFAULT_PAYROLL_EXPENSE_CATEGORY],
  [undefined, DEFAULT_PAYROLL_EXPENSE_CATEGORY],
];

assert.equal(DEFAULT_PAYROLL_EXPENSE_CATEGORY, 'salary');

for (const [industry, category] of expected) {
  assert.equal(getPayrollExpenseCategory(industry), category, String(industry));
}

const draft = buildPayrollExpenseDraft({
  teacher: { id: 't1', name: '김강사' } as Teacher,
  yearMonth: '2026-10',
  amount: 1000,
  quantity: 1,
  rate: 1000,
  payType: 'monthly',
  calculatedAmount: 1000,
  industry: 'taekwondo',
});
assert.equal(draft.category, 'instructor_fee');

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../../..');
const draftSrc = readFileSync(join(here, 'expenseDraft.ts'), 'utf8');
const fnStart = draftSrc.indexOf('export function getPayrollExpenseCategory');
const fnEnd = draftSrc.indexOf('export function settlementExpenseDate');
const fn = draftSrc.slice(fnStart, fnEnd);
assert.doesNotMatch(fn, /industry\s*===/);
assert.doesNotMatch(fn, /'(pilates|skin_clinic|gym|taekwondo|daycare|piano|preschool|kindergarten)'/);

const wiring: [string, RegExp][] = [
  ['industries/piano/plugin.ts', /getPayrollExpenseCategory:\s*pianoPayrollExpenseCategory/],
  ['industries/pilates/plugin.ts', /getPayrollExpenseCategory:\s*pilatesPayrollExpenseCategory/],
  ['industries/gym/plugin.ts', /getPayrollExpenseCategory:\s*gymPayrollExpenseCategory/],
  ['industries/daycare/plugin.ts', /getPayrollExpenseCategory:\s*daycarePayrollExpenseCategory/],
  ['industries/skin/plugin.ts', /getPayrollExpenseCategory:\s*skinPayrollExpenseCategory/],
];
for (const [rel, pattern] of wiring) {
  assert.match(readFileSync(join(srcRoot, rel), 'utf8'), pattern, rel);
}

for (const rel of [
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
  'core/industry/genericPlugin.ts',
]) {
  assert.doesNotMatch(
    readFileSync(join(srcRoot, rel), 'utf8'),
    /getPayrollExpenseCategory/,
    rel
  );
}

console.log('payrollExpenseCategory.test.ts: ok');
