/**
 * Unit tests for resourceProvisioner (Refine v5 Dynamic Resource Assembly)
 * Run: npx tsx src/app/industry/resourceProvisioner.test.ts
 */

import assert from 'node:assert/strict';
import { provisionIndustryResources } from './resourceProvisioner';
import { createI18nProvider } from '@/providers/i18nProvider';

console.log('[TEST] resourceProvisioner suite starting...');

const dummyI18n = createI18nProvider();

// 1. Default fallback when industry is undefined/null
const defaultRes = provisionIndustryResources({
  industry: null,
  i18n: dummyI18n,
});
assert.ok(defaultRes.length > 0, 'Must have base resources');
const dashboard = defaultRes.find((r) => r.name === 'dashboard');
assert.ok(dashboard, 'Must include dashboard');
const customers = defaultRes.find((r) => r.name === 'customers');
assert.ok(customers, 'Must include customers by default');
console.log('✓ Default resource fallback passed');

// 2. Study cafe preset should assemble seat_rooms, session_passes, lockers, maintenance_tasks
const studyCafeRes = provisionIndustryResources({
  industry: 'study_cafe',
  i18n: dummyI18n,
});
const scNames = new Set(studyCafeRes.map((r) => r.name));
assert.ok(scNames.has('dashboard'));
assert.ok(scNames.has('seat_rooms'), 'study_cafe must have seat_rooms resource');
assert.ok(scNames.has('passes'), 'study_cafe must have passes resource');
assert.ok(scNames.has('lockers'), 'study_cafe must have lockers resource');
assert.ok(scNames.has('maintenance_checklists'), 'study_cafe must have maintenance_checklists resource');
console.log('✓ Study cafe assembled resources passed');

// 3. Hair salon preset should assemble bookings, treatment_charts, staff_shifts
const hairSalonRes = provisionIndustryResources({
  industry: 'hair_salon',
  i18n: dummyI18n,
});
const hsNames = new Set(hairSalonRes.map((r) => r.name));
assert.ok(hsNames.has('bookings'), 'hair_salon must have bookings resource');
assert.ok(hsNames.has('treatment_charts'), 'hair_salon must have treatment_charts resource');
assert.ok(hsNames.has('shift_schedules'), 'hair_salon must have shift_schedules resource');
console.log('✓ Hair salon assembled resources passed');

// 4. Equipment rental preset should assemble equipment_rentals, inventory_items, safety_waivers
const rentalRes = provisionIndustryResources({
  industry: 'equipment_rental',
  i18n: dummyI18n,
});
const rentalNames = new Set(rentalRes.map((r) => r.name));
assert.ok(rentalNames.has('rental_equipments'), 'equipment_rental must have rental_equipments resource');
assert.ok(rentalNames.has('inventory_items'), 'equipment_rental must have inventory_items resource');
assert.ok(rentalNames.has('safety_consents'), 'equipment_rental must have safety_consents resource');
console.log('✓ Equipment rental assembled resources passed');

// 5. Deduplication check: each resource name must appear exactly once
for (const ind of ['piano', 'pilates', 'auto_repair', 'study_cafe']) {
  const res = provisionIndustryResources({ industry: ind, i18n: dummyI18n });
  const names = res.map((r) => r.name);
  const uniqueNames = new Set(names);
  assert.equal(names.length, uniqueNames.size, `Resource names for ${ind} must be unique`);
}
console.log('✓ Resource deduplication passed');

console.log('[TEST] resourceProvisioner ALL TESTS PASSED!');
