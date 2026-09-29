/**
 * Retail 메뉴 뼈대 불변조건.
 * 실행: npx tsx src/industries/retail/config/nav.structure.test.ts
 */
import assert from 'node:assert/strict';
import { retailModuleLabels } from './labels';
import { getRetailMainTabs, getRetailMoreTabs, getRetailSidebarSections } from './nav';
import { retailPluginManifest } from '../plugin';

function run(): void {
  const main = getRetailMainTabs(retailModuleLabels);
  assert.deepEqual(
    main.map((t) => t.label),
    ['홈', '판매', '상품', '재고', '고객']
  );
  assert.deepEqual(
    main.map((t) => t.tab),
    ['dashboard', 'sales', 'retail', 'inventory', 'members']
  );

  const more = getRetailMoreTabs(retailModuleLabels);
  assert.deepEqual(
    more.map((t) => t.label),
    ['매출', '판매내역', '직원', '설정']
  );
  assert.deepEqual(
    more.map((t) => t.tab),
    ['reports', 'income', 'instructors', 'settings']
  );

  const sections = getRetailSidebarSections(retailModuleLabels);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, '업무');
  assert.equal(sections[1].title, '더보기');

  for (const tab of [...main, ...more].map((t) => t.tab)) {
    assert.ok(
      retailPluginManifest.adminTabs.includes(tab),
      `adminTabs missing: ${tab}`
    );
  }

  // Staff 최소 권한 — 상품·매출·직원·설정 제외, 판매내역·재고(조회) 포함
  const staffCore = retailPluginManifest.staffTabs.filter((t) => t !== 'notices');
  assert.deepEqual(staffCore, [
    'dashboard',
    'sales',
    'inventory',
    'members',
    'income',
  ]);
  for (const denied of ['retail', 'reports', 'instructors', 'settings'] as const) {
    assert.ok(
      !retailPluginManifest.staffTabs.includes(denied),
      `staff must not have: ${denied}`
    );
  }

  console.log('nav.structure.test.ts OK');
}

run();
