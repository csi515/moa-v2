/**
 * 실행: npm run test:nav-utils
 */
import assert from 'node:assert/strict';
import { groupMoreNavItems, type NavMenuItem } from './navUtils';
import { mobileMainNavIssues } from './mobileNavPolicy';

function item(tab: NavMenuItem['tab'], section?: string): NavMenuItem {
  return { tab, label: tab, icon: null, section };
}

function run(): void {
  const flat = groupMoreNavItems([item('settings'), item('finance')]);
  assert.equal(flat.length, 1);
  assert.equal(flat[0].title, '');
  assert.equal(flat[0].items.length, 2);

  const grouped = groupMoreNavItems([
    item('consultations', '업무'),
    item('finance', '업무'),
    item('classes', '관리'),
    item('settings', '설정'),
  ]);
  assert.deepEqual(
    grouped.map((s) => s.title),
    ['업무', '관리', '설정']
  );
  assert.equal(grouped[0].items.length, 2);

  assert.deepEqual(mobileMainNavIssues({ tabs: ['dashboard', 'students', 'timetable', 'attendance'] }), []);
  assert.ok(mobileMainNavIssues({ tabs: ['dashboard', 'sales', 'retail', 'inventory', 'members'] }).length > 0);
  assert.deepEqual(
    mobileMainNavIssues({
      tabs: ['dashboard', 'sales', 'retail', 'inventory', 'members'],
      reason: 'POS 카운터 핵심',
    }),
    []
  );

  console.log('navUtils.test.ts: ok');
}

run();
