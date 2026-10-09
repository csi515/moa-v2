/**
 * Phase 5: Multi-Vertical Full Lifecycle E2E Integration Suite
 * 
 * Verifies 6 representative verticals across their complete lifecycle:
 * 1. Piano (Education / Academy)
 * 2. Pilates (Booking / Fitness)
 * 3. Retail (Commerce / Inventory)
 * 4. Study Cafe (Space / Facility / Time Pass)
 * 5. Hair Salon (1:1 Appointment / Beauty / Shift)
 * 6. Auto Repair (Operation / Workflow / VIN)
 *
 * Verifies:
 * - Onboarding Question Generation & Payload Building
 * - Preset Capability Assembly & Refine v5 Dynamic Resource Provisioning
 * - Business Rules Engine Resolution & Tenant Overrides
 * - Role-Based Access Control Template Integrity
 * - Cross-Tenant Context Isolation & Invariant Safety
 *
 * Run: npx tsx src/app/presets/presetMultiVerticalE2E.test.ts
 */

import assert from 'node:assert/strict';
import { getIndustryPreset } from './presetRegistry';
import { assemblePreset } from './presetAssembler';
import {
  getQuestionsForIndustry,
  buildPresetPayload,
} from './presetQuestionEngine';
import {
  resolveBusinessRules,
  getBusinessRule,
  isBusinessRuleTrue,
} from './presetBusinessRules';
import { provisionIndustryResources } from '@/app/industry/resourceProvisioner';
import { createI18nProvider } from '@/providers/i18nProvider';

console.log('[E2E TEST] Starting 6-Vertical Full Lifecycle Verification Suite...\n');

const dummyI18n = createI18nProvider();

// =========================================================================
// 1. Piano (피아노·음악학원)
// =========================================================================
console.log('--- [1/6] Verifying Piano (피아노·음악학원) ---');
const pianoPreset = getIndustryPreset('piano');
assert.ok(pianoPreset, 'Piano preset must exist');

// 1.1 Onboarding
const pianoQuestions = getQuestionsForIndustry('piano');
assert.ok(pianoQuestions.length >= 3, 'Piano must have specific onboarding questions');
const pianoPayload = buildPresetPayload('piano');
assert.equal(pianoPayload.industry, 'piano');
assert.ok(pianoPayload.roles.length >= 3);
assert.ok(pianoPayload.rooms && pianoPayload.rooms.length > 0);

// 1.2 Resource Assembly & Refine Provisioning
const pianoAssembled = assemblePreset('piano');
const pianoAssembledNames = new Set(pianoAssembled.resources.map((r) => r.name));
assert.ok(pianoAssembledNames.has('seat_rooms'));
assert.ok(pianoAssembledNames.has('attendance'));
assert.ok(pianoAssembledNames.has('passes'));

const pianoRefineRes = provisionIndustryResources({ industry: 'piano', i18n: dummyI18n });
const pianoRefineNames = new Set(pianoRefineRes.map((r) => r.name));
assert.ok(pianoRefineNames.has('dashboard'));
assert.ok(pianoRefineNames.has('customers'));
assert.ok(pianoRefineNames.has('seat_rooms'));

// 1.3 Business Rules
const pianoRules = resolveBusinessRules('piano');
assert.equal(pianoRules.lessonDurationMinutes, 30);
assert.equal(isBusinessRuleTrue('piano', 'autoCheckInDeduct'), true);
assert.equal(isBusinessRuleTrue('piano', 'mandatorySafetyWaiver'), false);

// 1.4 Roles
const pianoDirector = pianoPreset.roles?.find((r) => r.name === '원장');
const pianoAssistant = pianoPreset.roles?.find((r) => r.name === '파트강사');
assert.ok(pianoDirector?.permissions.includes('*'));
assert.ok(pianoAssistant?.permissions.includes('attendance:checkin'));
console.log('✓ Piano full lifecycle verified successfully\n');


// =========================================================================
// 2. Pilates (필라테스 스튜디오)
// =========================================================================
console.log('--- [2/6] Verifying Pilates (필라테스 스튜디오) ---');
const pilatesPreset = getIndustryPreset('pilates');
assert.ok(pilatesPreset, 'Pilates preset must exist');

// 2.1 Onboarding
const pilatesQuestions = getQuestionsForIndustry('pilates');
assert.ok(pilatesQuestions.some((q) => q.capabilityId === 'booking'), 'Pilates must have booking questions');
const pilatesPayload = buildPresetPayload('pilates');
assert.equal(pilatesPayload.industry, 'pilates');
assert.ok(pilatesPayload.roles.length >= 2);

// 2.2 Resource Assembly & Refine Provisioning
const pilatesAssembled = assemblePreset('pilates');
const pilatesAssembledNames = new Set(pilatesAssembled.resources.map((r) => r.name));
assert.ok(pilatesAssembledNames.has('bookings'));
assert.ok(pilatesAssembledNames.has('lockers'));
assert.ok(pilatesAssembledNames.has('passes'));

const pilatesRefineRes = provisionIndustryResources({ industry: 'pilates', i18n: dummyI18n });
const pilatesRefineNames = new Set(pilatesRefineRes.map((r) => r.name));
assert.ok(pilatesRefineNames.has('bookings'));
assert.ok(pilatesRefineNames.has('lockers'));

// 2.3 Business Rules & Tenant Override
const pilatesRules = resolveBusinessRules('pilates');
assert.equal(pilatesRules.cancelCutoffHours, 6, 'Preset default cancelCutoffHours is 6');
assert.equal(pilatesRules.maxGroupCapacity, 6);

const pilatesTenantOrg = {
  industry_type: 'pilates',
  settings: {
    business_rules: {
      cancelCutoffHours: 12, // Tenant override
    },
  },
};
assert.equal(getBusinessRule(pilatesTenantOrg, 'cancelCutoffHours', 0), 12);
console.log('✓ Pilates full lifecycle verified successfully\n');


// =========================================================================
// 3. Retail (일반 소매점)
// =========================================================================
console.log('--- [3/6] Verifying Retail (일반 소매점) ---');
const retailPreset = getIndustryPreset('retail');
assert.ok(retailPreset, 'Retail preset must exist');

// 3.1 Resource Assembly & Refine Provisioning
const retailAssembled = assemblePreset('retail');
const retailAssembledNames = new Set(retailAssembled.resources.map((r) => r.name));
assert.ok(retailAssembledNames.has('inventory_items'));
assert.ok(retailAssembledNames.has('credit_wallets'));
assert.ok(retailAssembledNames.has('simple_ledgers'));

const retailRefineRes = provisionIndustryResources({ industry: 'retail', i18n: dummyI18n });
const retailRefineNames = new Set(retailRefineRes.map((r) => r.name));
assert.ok(retailRefineNames.has('inventory_items'));
assert.ok(retailRefineNames.has('credit_wallets'));

// 3.2 Business Rules
assert.equal(getBusinessRule('retail', 'pointEarnPercent', 0), 1.0);
assert.equal(getBusinessRule('retail', 'lowStockAlertThreshold', 0), 5);
console.log('✓ Retail full lifecycle verified successfully\n');


// =========================================================================
// 4. Study Cafe (스터디카페 / 공간대여)
// =========================================================================
console.log('--- [4/6] Verifying Study Cafe (스터디카페) ---');
const studyCafePreset = getIndustryPreset('study_cafe');
assert.ok(studyCafePreset, 'Study cafe preset must exist');

// 4.1 Onboarding
const scPayload = buildPresetPayload('study_cafe');
assert.equal(scPayload.industry, 'study_cafe');
assert.ok(scPayload.locker_count !== undefined);

// 4.2 Resource Assembly & Refine Provisioning
const scAssembled = assemblePreset('study_cafe');
const scAssembledNames = new Set(scAssembled.resources.map((r) => r.name));
assert.ok(scAssembledNames.has('seat_rooms'));
assert.ok(scAssembledNames.has('passes'));
assert.ok(scAssembledNames.has('lockers'));
assert.ok(scAssembledNames.has('maintenance_checklists'));

const scRefineRes = provisionIndustryResources({ industry: 'study_cafe', i18n: dummyI18n });
const scRefineNames = new Set(scRefineRes.map((r) => r.name));
assert.ok(scRefineNames.has('seat_rooms'));
assert.ok(scRefineNames.has('passes'));
assert.ok(scRefineNames.has('lockers'));

// 4.3 Business Rules
assert.equal(isBusinessRuleTrue('study_cafe', 'timePassAutoExpire'), true);
console.log('✓ Study cafe full lifecycle verified successfully\n');


// =========================================================================
// 5. Hair Salon (헤어샵 / 뷰티 살롱)
// =========================================================================
console.log('--- [5/6] Verifying Hair Salon (헤어샵) ---');
const hairSalonPreset = getIndustryPreset('hair_salon');
assert.ok(hairSalonPreset, 'Hair salon preset must exist');

// 5.1 Resource Assembly & Refine Provisioning
const hsAssembled = assemblePreset('hair_salon');
const hsAssembledNames = new Set(hsAssembled.resources.map((r) => r.name));
assert.ok(hsAssembledNames.has('bookings'));
assert.ok(hsAssembledNames.has('treatment_charts'));
assert.ok(hsAssembledNames.has('shift_schedules'));
assert.ok(hsAssembledNames.has('inventory_items'));

const hsRefineRes = provisionIndustryResources({ industry: 'hair_salon', i18n: dummyI18n });
const hsRefineNames = new Set(hsRefineRes.map((r) => r.name));
assert.ok(hsRefineNames.has('bookings'));
assert.ok(hsRefineNames.has('treatment_charts'));
assert.ok(hsRefineNames.has('shift_schedules'));

// 5.2 Business Rules
assert.equal(getBusinessRule('hair_salon', 'slotMinutes', 0), 30);
assert.equal(isBusinessRuleTrue('hair_salon', 'doubleBookingAllowed'), false);
console.log('✓ Hair salon full lifecycle verified successfully\n');


// =========================================================================
// 6. Auto Repair (자동차 정비소)
// =========================================================================
console.log('--- [6/6] Verifying Auto Repair (자동차 정비소) ---');
const autoRepairPreset = getIndustryPreset('auto_repair');
assert.ok(autoRepairPreset, 'Auto repair preset must exist');

// 6.1 Resource Assembly & Refine Provisioning
const arAssembled = assemblePreset('auto_repair');
const arAssembledNames = new Set(arAssembled.resources.map((r) => r.name));
assert.ok(arAssembledNames.has('task_pipelines'));
assert.ok(arAssembledNames.has('inventory_items'));
assert.ok(arAssembledNames.has('billing_invoices'));

const arRefineRes = provisionIndustryResources({ industry: 'auto_repair', i18n: dummyI18n });
const arRefineNames = new Set(arRefineRes.map((r) => r.name));
assert.ok(arRefineNames.has('task_pipelines'));
assert.ok(arRefineNames.has('inventory_items'));
assert.ok(arRefineNames.has('billing_invoices'));

// 6.2 Business Rules
assert.equal(isBusinessRuleTrue('auto_repair', 'vinRequired'), true);
assert.equal(getBusinessRule('auto_repair', 'workOrderStages', 0), 4);
console.log('✓ Auto repair full lifecycle verified successfully\n');


// =========================================================================
// 7. Cross-Tenant Context & Isolation Invariant Check
// =========================================================================
console.log('--- [7/7] Cross-Tenant Isolation & Invariant Safety Check ---');
const orgA = {
  id: 'org-piano-101',
  industry_type: 'piano',
  settings: {
    business_rules: {
      lessonDurationMinutes: 45,
    },
  },
};

const orgB = {
  id: 'org-climbing-202',
  industry_type: 'climbing_activity',
  settings: {
    business_rules: {
      customWaiverNotice: '동의서 필수 작성',
    },
  },
};

// Verify Tenant A rules
const rulesA = resolveBusinessRules(orgA);
assert.equal(rulesA.lessonDurationMinutes, 45, 'Tenant A override must be effective');
assert.equal(rulesA.autoCheckInDeduct, true, 'Tenant A preset default preserved');
assert.equal(rulesA.mandatorySafetyWaiver, undefined, 'Tenant A must not have safety waiver');

// Verify Tenant B rules
const rulesB = resolveBusinessRules(orgB);
assert.equal(rulesB.mandatorySafetyWaiver, true, 'Tenant B climbing requires safety waiver');
assert.equal(rulesB.lessonDurationMinutes, undefined, 'Tenant B must not have piano lesson duration');
assert.equal(rulesB.customWaiverNotice, '동의서 필수 작성');

// Invariant: Tenant A and B resolution is completely isolated
assert.notDeepEqual(rulesA, rulesB);
console.log('✓ Cross-tenant context isolation strictly verified\n');

console.log('===============================================================');
console.log('🎉 [E2E SUITE SUCCESS] All 6 Verticals & Multi-Tenant Invariants Passed!');
console.log('===============================================================');
