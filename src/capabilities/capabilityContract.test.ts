/**
 * Capability 계약. 구현 이전 매니페스트 무결성.
 * 실행: npm run test:capability-contract
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAPABILITY_IDS,
  CAPABILITY_MANIFESTS,
  assertCapabilityDefinition,
} from './index';

function run() {
  assert.equal(CAPABILITY_MANIFESTS.length, CAPABILITY_IDS.length);

  const seen = new Set<string>();
  for (const manifest of CAPABILITY_MANIFESTS) {
    assertCapabilityDefinition(manifest.definition);
    assert.equal(seen.has(manifest.definition.id), false, `duplicate: ${manifest.definition.id}`);
    seen.add(manifest.definition.id);
    assert.equal(typeof manifest.definition.configurable, 'boolean');
    assert.equal(typeof manifest.definition.defaultEnabled, 'boolean');
    assert.ok(Array.isArray(manifest.definition.requiredPermissions));
  }

  for (const id of CAPABILITY_IDS) {
    assert.equal(seen.has(id), true, `missing manifest: ${id}`);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  for (const id of CAPABILITY_IDS) {
    const src = readFileSync(join(here, id, 'manifest.ts'), 'utf8');
    assert.equal(src.includes('@/modules/'), false, `${id} manifest must not import modules`);
    assert.equal(src.includes('@/industries/'), false, `${id} manifest must not import industries`);
    assert.equal(src.includes('@/app/'), false, `${id} manifest must not import Composition`);
    assert.match(src, /defineCapability/);
  }

  console.log(`capabilityContract.test.ts: ok (${CAPABILITY_IDS.length} capabilities)`);
}

run();
