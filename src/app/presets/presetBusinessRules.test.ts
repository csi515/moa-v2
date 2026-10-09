/**
 * Unit tests for presetBusinessRules engine
 * Run: npx tsx src/app/presets/presetBusinessRules.test.ts
 */

import assert from 'node:assert/strict';
import {
  resolveBusinessRules,
  getBusinessRule,
  isBusinessRuleTrue,
  hasBusinessRule,
} from './presetBusinessRules';
import { listIndustryPresets } from './presetRegistry';

console.log('[TEST] presetBusinessRules suite starting...');

// 1. Preset string-based resolution
const pilatesRules = resolveBusinessRules('pilates');
assert.equal(pilatesRules.cancelCutoffHours, 6);
assert.equal(pilatesRules.maxGroupCapacity, 6);
assert.equal(getBusinessRule('pilates', 'cancelCutoffHours', 0), 6);
assert.equal(getBusinessRule('pilates', 'maxGroupCapacity', 0), 6);
console.log('✓ Pilates default business rules passed');

// 2. Safety waiver rules
assert.equal(isBusinessRuleTrue('climbing_activity', 'mandatorySafetyWaiver'), true);
assert.equal(isBusinessRuleTrue('boxing_mma', 'mandatorySafetyWaiver'), true);
assert.equal(isBusinessRuleTrue('piano', 'mandatorySafetyWaiver'), false);
console.log('✓ Mandatory safety waiver checks passed');

// 3. Beauty and salon scheduling rules
assert.equal(getBusinessRule('hair_salon', 'slotMinutes', 0), 30);
assert.equal(isBusinessRuleTrue('hair_salon', 'doubleBookingAllowed'), false);
assert.equal(isBusinessRuleTrue('skin_clinic', 'skinAnalysisBeforeTreatment'), true);
console.log('✓ Hair salon and skin clinic rules passed');

// 4. Space, locker, and hospitality rules
assert.equal(isBusinessRuleTrue('study_cafe', 'timePassAutoExpire'), true);
assert.equal(getBusinessRule('shared_office', 'monthlyRentBillingDay', 0), 1);
assert.equal(isBusinessRuleTrue('locker_storage', 'lockerOverdueLockout'), true);
assert.equal(getBusinessRule('guesthouse', 'checkInHour', 0), 15);
assert.equal(getBusinessRule('guesthouse', 'checkOutHour', 0), 11);
console.log('✓ Space rental and lodging rules passed');

// 5. Commerce, equipment, and automotive rules
assert.equal(getBusinessRule('retail', 'pointEarnPercent', 0), 1.0);
assert.equal(getBusinessRule('retail', 'lowStockAlertThreshold', 0), 5);
assert.equal(isBusinessRuleTrue('equipment_rental', 'returnInspectionMandatory'), true);
assert.equal(isBusinessRuleTrue('equipment_rental', 'lateFeeDailyRate'), true);
assert.equal(isBusinessRuleTrue('auto_repair', 'vinRequired'), true);
assert.equal(getBusinessRule('auto_repair', 'workOrderStages', 0), 4);
console.log('✓ Commerce, rental, and auto repair rules passed');

// 6. Organization context object resolution & tenant override
const mockOrg = {
  industry_type: 'pilates',
  settings: {
    business_rules: {
      cancelCutoffHours: 12, // override 6 -> 12
      customVipDiscount: 20, // new tenant-specific rule
    },
  },
};
const resolvedOrgRules = resolveBusinessRules(mockOrg);
assert.equal(resolvedOrgRules.cancelCutoffHours, 12, 'Tenant override should take precedence');
assert.equal(resolvedOrgRules.maxGroupCapacity, 6, 'Preset default should be preserved');
assert.equal(getBusinessRule(mockOrg, 'cancelCutoffHours', 0), 12);
assert.equal(getBusinessRule(mockOrg, 'maxGroupCapacity', 0), 6);
assert.equal(getBusinessRule(mockOrg, 'customVipDiscount', 0), 20);
assert.equal(getBusinessRule(mockOrg, 'nonExistentRule', 99), 99, 'Default value fallback');
console.log('✓ Tenant organization overrides passed');

// 7. Null and edge-case handling
assert.deepEqual(resolveBusinessRules(null), {});
assert.deepEqual(resolveBusinessRules(undefined), {});
assert.deepEqual(resolveBusinessRules(''), {});
assert.equal(hasBusinessRule('pilates', 'cancelCutoffHours'), true);
assert.equal(hasBusinessRule('pilates', 'nonExistent'), false);
console.log('✓ Null and edge cases passed');

// 8. Batch verification over all 42 presets
const allPresets = listIndustryPresets();
for (const p of allPresets) {
  const rules = resolveBusinessRules(p.id);
  assert.ok(typeof rules === 'object', `Rules for ${p.id} must be an object`);
  if (p.businessRules) {
    for (const [k, v] of Object.entries(p.businessRules)) {
      assert.equal(rules[k], v, `Rule ${k} on preset ${p.id} must match preset definition`);
    }
  }
}
console.log(`✓ All ${allPresets.length} presets verified in business rules engine!`);

console.log('[TEST] presetBusinessRules ALL TESTS PASSED!');
