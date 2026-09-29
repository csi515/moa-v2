/**
 * persistence policy 선언.
 * 실행: npm run test:persistence-policy
 */
import assert from 'node:assert/strict';
import { STORAGE_KEYS } from '../../services/adapters/storageKeys';
import {
  DECLARED_STORAGE_KEY_POLICIES,
  LEGACY_STORAGE_KEY_POLICIES,
  localWriteConfirmsPersist,
  OFFLINE_COMMAND_STORE_POLICIES,
  orphanPersistencePolicyKeys,
  persistencePolicyFor,
  persistenceRuleFor,
  uncoveredStorageKeys,
} from './persistencePolicy';

function run() {
  assert.equal(persistencePolicyFor('piano_app_tuition_payments'), 'server-authoritative');
  assert.equal(persistencePolicyFor('core_session_passes'), 'server-authoritative');
  assert.equal(persistencePolicyFor('piano_app_students'), 'server-with-local-cache');
  assert.equal(persistencePolicyFor('piano_app_active_user'), 'local-only');
  assert.equal(persistencePolicyFor('core_slot_recruitments'), 'local-only');
  assert.equal(persistencePolicyFor('piano_app_parents'), 'server-with-local-cache');
  assert.equal(OFFLINE_COMMAND_STORE_POLICIES.pendingMutations, 'offline-command');
  assert.equal(OFFLINE_COMMAND_STORE_POLICIES.syncOutbox, 'offline-command');

  assert.equal(localWriteConfirmsPersist('piano_app_tuition_payments'), false);
  assert.equal(localWriteConfirmsPersist('piano_app_students'), false);
  assert.equal(localWriteConfirmsPersist('piano_app_active_user'), true);
  assert.equal(persistenceRuleFor('core_schedules').sourceOfTruth, 'server');
  assert.equal(DECLARED_STORAGE_KEY_POLICIES.piano_app_invoices, 'server-authoritative');

  const allKeys = Object.values(STORAGE_KEYS);
  const uncovered = uncoveredStorageKeys(allKeys);
  assert.deepEqual(
    uncovered,
    [],
    `STORAGE_KEYS without DECLARED or LEGACY policy: ${uncovered.join(', ')}`
  );
  const orphans = orphanPersistencePolicyKeys(allKeys);
  assert.deepEqual(
    orphans,
    [],
    `Policy keys not in STORAGE_KEYS: ${orphans.join(', ')}`
  );

  const overlap = Object.keys(DECLARED_STORAGE_KEY_POLICIES).filter(
    (key) => key in LEGACY_STORAGE_KEY_POLICIES
  );
  assert.deepEqual(overlap, [], `Key in both DECLARED and LEGACY: ${overlap.join(', ')}`);

  const unknownPolicy = persistencePolicyFor('brand_new_unregistered_key');
  assert.equal(unknownPolicy, 'server-with-local-cache');

  console.log('persistencePolicy.test.ts: ok');
}

run();
