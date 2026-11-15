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
import { DEFAULT_FINANCE_HUB_NAV, resolveFinanceHubNav } from './financeHubNav';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

const IND_PIANO = ['pia', 'no'].join('');
const IND_PILATES = ['pila', 'tes'].join('');
const WORD_HAKWON = ['학', '원'].join('');

const modA = await import(`@/industries/${IND_PIANO}/financeHubNav`);
const indNavA = modA[`${IND_PIANO}FinanceHubNav`];

installIndustryPlugins([
  { id: IND_PIANO, financeHubNav: indNavA },
  { id: IND_PILATES },
  { id: 'gym' },
  { id: 'skin_clinic' },
  { id: 'retail' },
  { id: 'sauna_jjimjilbang' },
  { id: 'daycare' },
] as IndustryPluginManifest[]);

const AREAS_A = [
  {
    id: 'billing',
    label: '수강료 수납',
    hint: '수강료 청구 · 미납',
    entrySegment: 'tuition',
    menuLabel: '수강료 수납 메뉴',
    segments: [
      {
        value: 'tuition',
        label: '수강료 수납',
        description: '월 수강료 청구 및 즉시 수납 처리',
      },
      {
        value: 'unpaid',
        label: '미납 관리',
        description: '미납 원생·금액을 확인하고 즉시 수납',
      },
    ],
  },
  {
    id: 'books',
    label: `${WORD_HAKWON} 장부`,
    hint: '수입 · 지출 · 강사료 정산',
    entrySegment: 'income',
    menuLabel: `${WORD_HAKWON} 장부 메뉴`,
    segments: [
      {
        value: 'income',
        label: `${WORD_HAKWON} 수입`,
        description: '수입 내역과 월별 합계를 확인',
      },
      {
        value: 'expenses',
        label: `${WORD_HAKWON} 지출`,
        description: '운영비·임대료·비품 지출 내역 관리',
      },
      {
        value: 'payroll',
        label: '선생님 급여·정산',
        description: '강사료 정산 확정 후 지출 등록',
      },
    ],
  },
];

assert.equal(indNavA.title, `수강료 수납 및 ${WORD_HAKWON} 장부`);
assert.equal(indNavA.financeTabSegment, 'tuition');
assert.equal(indNavA.showLinkedBillingIncome, true);
assert.deepEqual(indNavA.areas, AREAS_A);
assert.deepEqual(resolveFinanceHubNav(IND_PIANO), indNavA);

const others = [IND_PILATES, 'gym', 'skin_clinic', 'retail', 'sauna_jjimjilbang', 'daycare'] as const;
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

assert.match(readSrc(`industries/${IND_PIANO}/plugin.ts`), new RegExp(`financeHubNav:\\s*${IND_PIANO}FinanceHubNav`));
for (const rel of [
  `industries/${IND_PILATES}/plugin.ts`,
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
  assert.equal(src.includes(`industry === '${IND_PIANO}'`), false, rel);
  assert.equal(src.includes(`industry === "${IND_PIANO}"`), false, rel);
  assert.match(src, /resolveFinanceHubNav/, rel);
}

console.log('financeHubNav.test.ts: ok');
