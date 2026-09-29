/**
 * persist 게이트 규칙 unit test
 * 실행: npm run test:persist-policy
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  canDiffDeleteSnapshot,
  canPersistRemote,
  isPersistEpochCurrent,
  nextPersistEpoch,
} from './persistPolicy';

function run() {
  assert.equal(canPersistRemote({ hydrated: false, offlineHydrated: false }), false);
  assert.equal(canPersistRemote({ hydrated: true, offlineHydrated: true }), false);
  assert.equal(canPersistRemote({ hydrated: false, offlineHydrated: true }), false);
  assert.equal(canPersistRemote({ hydrated: true, offlineHydrated: false }), true);

  assert.equal(nextPersistEpoch(undefined), 1);
  assert.equal(nextPersistEpoch(3), 4);
  assert.equal(isPersistEpochCurrent(2, 2), true);
  assert.equal(isPersistEpochCurrent(2, 3), false);
  assert.equal(isPersistEpochCurrent(0, undefined), true);
  assert.equal(isPersistEpochCurrent(1, undefined), false);

  assert.equal(canDiffDeleteSnapshot({ cachePresent: true, snapshotComplete: true }), true);
  assert.equal(canDiffDeleteSnapshot({ cachePresent: true, snapshotComplete: false }), false);
  assert.equal(canDiffDeleteSnapshot({ cachePresent: false, snapshotComplete: true }), false);
  assert.equal(canDiffDeleteSnapshot({ cachePresent: false, snapshotComplete: false }), false);

  const here = dirname(fileURLToPath(import.meta.url));
  const adapterSource = readFileSync(join(here, 'supabaseAdapter.ts'), 'utf8');
  assert.match(adapterSource, /canPersistRemote/);
  assert.match(adapterSource, /isPersistEpochCurrent/);
  assert.match(adapterSource, /nextPersistEpoch/);
  assert.match(adapterSource, /persistEpochs/);
  assert.equal(adapterSource.includes('if (!this.hydrated) return false;'), false);

  console.log('persistPolicy.test.ts: ok');
}

run();
