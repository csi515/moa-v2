/**
 * 재무 허브 제목·탭은 플러그인 financeHubNav만 따른다.
 * 실행: npx tsx src/capabilities/billing/finance/financeHubNav.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installIndustryPlugins } from '@/core/industry/pluginHost';
import type { IndustryPluginManifest } from '@/core/industry/pluginTypes';
import { pianoFinanceHubNav } from '@/industries/piano/financeHubNav';
import { DEFAULT_FINANCE_HUB_NAV, resolveFinanceHubNav } from './financeHubNav';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

installIndustryPlugins([
  { id: 'piano', financeHubNav: pianoFinanceHubNav },
  { id: 'pilates' },
  { id: 'gym' },
  { id: 'skin_clinic' },
  { id: 'retail' },
  { id: 'sauna_jjimjilbang' },
  { id: 'daycare' },
] as IndustryPluginManifest[]);

const PIANO_AREAS = [
  {
    id: 'billing',
    label: '수납',
    hint: '청구 · 미납',
    entrySegment: 'tuition',
    menuLabel: '수납 메뉴',
    segments: [
      { value: 'tuition', label: '수납', description: '월 수강료 청구·수납 처리' },
      { value: 'unpaid', label: '미납', description: '미납 학생·금액을 확인하고 수납' },
    ],
  },
  {
    id: 'books',
    label: '재무 관리',
    hint: '수입 · 지출 · 정산',
    entrySegment: 'income',
    menuLabel: '재무 관리 메뉴',
    segments: [
      { value: 'income', label: '수입', description: '수입 내역과 합계를 확인' },
      { value: 'expenses', label: '지출', description: '지출 내역과 합계를 확인' },
      { value: 'payroll', label: '정산', description: '강사 정산 확정 후 지출 등록' },
    ],
  },
];

assert.equal(pianoFinanceHubNav.title, '수납·재무');
assert.equal(pianoFinanceHubNav.financeTabSegment, 'tuition');
assert.equal(pianoFinanceHubNav.showLinkedBillingIncome, true);
assert.deepEqual(pianoFinanceHubNav.areas, PIANO_AREAS);
assert.deepEqual(resolveFinanceHubNav('piano'), pianoFinanceHubNav);

const others = ['pilates', 'gym', 'skin_clinic', 'retail', 'sauna_jjimjilbang', 'daycare'] as const;
for (const id of others) {
  const nav = resolveFinanceHubNav(id);
  assert.deepEqual(nav, DEFAULT_FINANCE_HUB_NAV, id);
  assert.equal(nav.title, '재무', id);
  assert.equal(nav.financeTabSegment, 'overview', id);
  assert.equal(nav.showLinkedBillingIncome, false, id);
  assert.deepEqual(nav.areas, [], id);
}

assert.deepEqual(resolveFinanceHubNav(null), DEFAULT_FINANCE_HUB_NAV);
assert.deepEqual(resolveFinanceHubNav(''), DEFAULT_FINANCE_HUB_NAV);
assert.deepEqual(resolveFinanceHubNav('  '), DEFAULT_FINANCE_HUB_NAV);
assert.notEqual(resolveFinanceHubNav('').title, '수납·재무');

assert.match(readSrc('industries/piano/plugin.ts'), /financeHubNav:\s*pianoFinanceHubNav/);
for (const rel of [
  'industries/pilates/plugin.ts',
  'industries/gym/plugin.ts',
  'industries/skin/plugin.ts',
  'industries/retail/plugin.ts',
  'industries/bath/plugin.ts',
  'industries/daycare/plugin.ts',
]) {
  assert.equal(readSrc(rel).includes('financeHubNav'), false, rel);
}

for (const rel of [
  'capabilities/billing/finance/components/FinanceHubView.tsx',
  'capabilities/billing/finance/components/FinanceOverviewView.tsx',
]) {
  const src = readSrc(rel);
  assert.equal(src.includes("industry === 'piano'"), false, rel);
  assert.equal(src.includes('industry === "piano"'), false, rel);
  assert.match(src, /resolveFinanceHubNav/, rel);
}

console.log('financeHubNav.test.ts: ok');
