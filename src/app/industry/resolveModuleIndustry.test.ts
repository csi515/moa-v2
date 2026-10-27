/**
 * 실행: npx tsx src/app/industry/resolveModuleIndustry.test.ts
 */
import assert from 'node:assert/strict';
import {
  PRESET_MODULE_BINDINGS,
  isCorporateChromePreset,
  resolveModuleIndustryId,
  shouldUseModuleChrome,
} from './resolveModuleIndustry';

assert.equal(resolveModuleIndustryId('piano'), 'piano');
assert.equal(resolveModuleIndustryId('retail'), 'retail');
assert.equal(resolveModuleIndustryId('apparel_store'), 'retail');
assert.equal(resolveModuleIndustryId('convenience_store'), 'retail');
assert.equal(resolveModuleIndustryId('general_enterprise'), null);
assert.equal(resolveModuleIndustryId('personal_plant_ops'), null);
assert.equal(PRESET_MODULE_BINDINGS.apparel_store, 'retail');

assert.equal(isCorporateChromePreset('personal_plant_ops'), true);
assert.equal(isCorporateChromePreset('general_enterprise'), true);
assert.equal(isCorporateChromePreset('piano'), false);

assert.equal(shouldUseModuleChrome('piano', '/workspace'), true);
assert.equal(shouldUseModuleChrome('piano', '/billing'), false);
assert.equal(shouldUseModuleChrome('personal_plant_ops', '/workspace'), true);
assert.equal(shouldUseModuleChrome('personal_plant_ops', '/workspace/approvals'), true);
assert.equal(shouldUseModuleChrome('personal_plant_ops', '/rnd'), true);
assert.equal(shouldUseModuleChrome('general_enterprise', '/workspace/mbo'), true);
assert.equal(shouldUseModuleChrome('apparel_store', '/workspace/sales'), true);

console.log('resolveModuleIndustry.test.ts: ok');
