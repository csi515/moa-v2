/**
 * Capability 네비 조합. 실행: npx tsx src/app/industry/capabilityNavigation.test.ts
 */
import assert from 'node:assert/strict';
import {
  CAPABILITY_IMPLEMENTATION_TABS,
  filterIndustryNavTabs,
  isNavTabAllowedForCapabilities,
  NAV_TAB_REQUIRED_CAPABILITY,
} from './capabilityNavigation';

function run(): void {
  assert.equal(isNavTabAllowedForCapabilities('dashboard', {}), true);
  assert.equal(isNavTabAllowedForCapabilities('tuition', { billing: true }), true);
  assert.equal(isNavTabAllowedForCapabilities('tuition', { billing: false }), false);
  assert.equal(isNavTabAllowedForCapabilities('income', { billing: true }), true);
  assert.equal(isNavTabAllowedForCapabilities('income', { commerce: true }), true);
  assert.equal(isNavTabAllowedForCapabilities('income', {}), false);

  const pianoTabs = filterIndustryNavTabs(
    ['dashboard', 'tuition', 'sales', 'shuttle', 'parents'],
    'piano'
  );
  assert.deepEqual(pianoTabs, ['dashboard', 'tuition', 'parents']);

  const retailTabs = filterIndustryNavTabs(['dashboard', 'tuition', 'sales', 'income'], 'retail');
  assert.deepEqual(retailTabs, ['dashboard', 'sales', 'income']);

  assert.equal(NAV_TAB_REQUIRED_CAPABILITY.attendance, 'attendance');
  assert.ok(CAPABILITY_IMPLEMENTATION_TABS.billing.includes('tuition'));

  console.log('capabilityNavigation.test.ts: ok');
}

run();
