import assert from 'node:assert/strict';
import { resolveIndustry, resolveIndustryId } from './resolveIndustry';
import { getIndustryPlugin } from './pluginHost';
import { resolveModuleIndustryId } from '../../app/industry/resolveModuleIndustry';
import { resolveIndustryAppKind } from './industryAppResolve';

assert.deepEqual(resolveIndustry(undefined), { status: 'not_loaded', id: null });
assert.deepEqual(resolveIndustry(null), { status: 'blank', id: null });
assert.deepEqual(resolveIndustry('  '), { status: 'blank', id: null });
assert.deepEqual(resolveIndustry('not_a_real_type'), { status: 'unknown', id: null });
assert.deepEqual(resolveIndustry('piano'), { status: 'known', id: 'piano' });
for (const raw of [undefined, null, '', 'not_a_real_type']) {
  assert.equal(resolveIndustryId(raw), null);
  assert.notEqual(getIndustryPlugin(raw).id, 'piano');
  assert.notEqual(resolveModuleIndustryId(raw), 'piano');
  assert.equal(resolveIndustryAppKind(raw), 'generic');
}
console.log('resolveIndustry.test.ts: ok');
