/**
 * 재무 요약의 수납 연동 수입은 업종 id 비교가 아니라 includesLinkedBillingIncome 플래그가 결정한다.
 * 실행: npx tsx src/capabilities/billing/finance/linkedIncomePlugin.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { includesLinkedBillingIncome } from '@/core/industry/industryUi';
import { installIndustryPlugin } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { createFinanceStorage } from '@/services/storage/financeStorage';
import type { StorageApi } from '@/services/storage/helpers';
import type { Expense, IncomeEntry } from '@/capabilities/billing/finance/types';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

function readFlag(rel: string): boolean {
  const source = readSrc(rel);
  const match = source.match(/includesLinkedBillingIncome:\s*(true|false)/);
  assert.ok(match, `${rel} must declare includesLinkedBillingIncome`);
  return match[1] === 'true';
}

const manifests: { id: string; rel: string }[] = [
  { id: 'piano', rel: 'industries/piano/plugin.ts' },
  { id: 'pilates', rel: 'industries/pilates/plugin.ts' },
  { id: 'gym', rel: 'industries/gym/plugin.ts' },
  { id: 'skin_clinic', rel: 'industries/skin/plugin.ts' },
  { id: 'retail', rel: 'industries/retail/plugin.ts' },
  { id: 'sauna_jjimjilbang', rel: 'industries/bath/plugin.ts' },
  { id: 'daycare', rel: 'industries/daycare/plugin.ts' },
];

for (const { id, rel } of manifests) {
  const flag = readFlag(rel);
  assert.equal(flag, id === 'piano', `${id} manifest includesLinkedBillingIncome`);
  installIndustryPlugin({
    id,
    includesLinkedBillingIncome: flag,
  } as IndustryPluginManifest);
  assert.equal(includesLinkedBillingIncome(id), flag, id);
}

assert.equal(readFlag('core/industry/genericPlugin.ts'), false);
assert.equal(includesLinkedBillingIncome(null), false);
assert.equal(includesLinkedBillingIncome(undefined), false);
assert.equal(includesLinkedBillingIncome(''), false);
assert.equal(includesLinkedBillingIncome('  '), false);
assert.equal(includesLinkedBillingIncome('preschool'), false);
assert.equal(includesLinkedBillingIncome('kindergarten'), false);
assert.equal(includesLinkedBillingIncome('taekwondo'), false);
assert.equal(includesLinkedBillingIncome('academy'), false);
assert.equal(includesLinkedBillingIncome(' piano'), false);
assert.equal(includesLinkedBillingIncome('piano '), false);

const storageSrc = readSrc('services/storage/financeStorage.ts');
assert.match(storageSrc, /getFinanceSummary\(industry:\s*string\s*=\s*'piano'\)/);
assert.doesNotMatch(storageSrc, /industry\s*===\s*['"]piano['"]/);
assert.match(
  readSrc('capabilities/billing/finance/billingLinkageValidation.ts'),
  /getFinanceSummary\('piano'\)/
);
assert.match(
  readSrc('capabilities/billing/finance/components/FinanceOverviewView.tsx'),
  /getFinanceSummary\(industry\)/
);

const yearMonth = new Date().toISOString().slice(0, 7);
const [year, month] = yearMonth.split('-').map((part) => Number(part));
const previous = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);

const entries: IncomeEntry[] = [
  { id: 'manual', date: `${yearMonth}-02`, category: 'etc', amount: 100, paymentMethod: 'cash', description: '일반', sourceType: 'manual' },
  { id: 'tuition', date: `${yearMonth}-03`, category: 'tuition', amount: 200, paymentMethod: 'transfer', description: '월회비', sourceType: 'tuition' },
  { id: 'textbook', date: `${yearMonth}-04`, category: 'textbook', amount: 50, paymentMethod: 'card', description: '교재', sourceType: 'textbook' },
  { id: 'booking', date: `${yearMonth}-05`, category: 'booking', amount: 30, paymentMethod: 'card', description: '예약', sourceType: 'booking' },
  { id: 'retail', date: `${yearMonth}-06`, category: 'retail', amount: 7, paymentMethod: 'card', description: '판매', sourceType: 'retail' },
  { id: 'old-tuition', date: `${previous}-01`, category: 'tuition', amount: 999, paymentMethod: 'transfer', description: '지난달', sourceType: 'tuition' },
];
const expenses: Expense[] = [
  { id: 'rent', date: `${yearMonth}-01`, category: 'rent', amount: 40, description: '임대' } as Expense,
];

const finance = createFinanceStorage({
  getIncomeEntries: () => entries,
  getExpenses: () => expenses,
} as StorageApi);

const expectedTotal = 100 + 200 + 50 + 30 + 7;
const expectedLinked = 200 + 50;
const piano = finance.getFinanceSummary('piano');
const omitted = finance.getFinanceSummary();
const blank = finance.getFinanceSummary('');
const spaced = finance.getFinanceSummary(' piano');
const alias = finance.getFinanceSummary('preschool');

assert.equal(piano.linkedIncomeThisMonth, expectedLinked, 'piano linked');
assert.equal(piano.totalIncomeThisMonth, expectedTotal, 'piano total');
assert.equal(piano.manualIncomeThisMonth, 100, 'piano manual');
assert.equal(piano.totalExpenseThisMonth, 40);
assert.equal(piano.netProfitThisMonth, expectedTotal - 40);
assert.deepEqual(
  { linked: omitted.linkedIncomeThisMonth, total: omitted.totalIncomeThisMonth },
  { linked: piano.linkedIncomeThisMonth, total: piano.totalIncomeThisMonth },
  'omitted argument keeps the piano default'
);

// 순수 데이터 계층(financeStorage)은 업종과 무관하게 실제 연동 수납 금액을 항상 정확히 계산해야 한다.
const others = ['pilates', 'gym', 'skin_clinic', 'retail', 'sauna_jjimjilbang', 'daycare', 'academy', 'preschool', 'taekwondo', '', '  ', ' piano', 'piano '] as const;
for (const id of others) {
  const summary = finance.getFinanceSummary(id);
  assert.equal(summary.linkedIncomeThisMonth, expectedLinked, `${id} linked must be pure aggregation`);
  assert.equal(summary.totalIncomeThisMonth, piano.totalIncomeThisMonth, `${id} total`);
  assert.equal(summary.manualIncomeThisMonth, piano.manualIncomeThisMonth, `${id} manual`);
  assert.equal(summary.totalExpenseThisMonth, piano.totalExpenseThisMonth, `${id} expense`);
  assert.equal(summary.netProfitThisMonth, piano.netProfitThisMonth, `${id} net`);
}

console.log('linkedIncomePlugin.test.ts: ok');
