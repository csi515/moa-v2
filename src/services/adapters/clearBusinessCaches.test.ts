/**
 * 로그아웃 시 업무 cache 삭제, device-only 유지.
 * 실행: npm run test:clear-business-caches
 */
import assert from 'node:assert/strict';
import { clearBusinessCachesOnSignOut } from './clearBusinessCaches';
import { isBusinessCacheKey, isPreservedOnSignOut, STORAGE_KEYS } from './storageKeys';
import { setOrganizationId } from './storageContext';
import { enqueueSyncOutbox, hasActionableSyncOutbox } from './syncOutbox';
import {
  confirmServerCommit,
  hasUncommittedMutationsOnDevice,
  markPendingUpsert,
  peekPendingMutations,
  prepareBusinessSignOut,
} from './pendingMutations';

function installMemoryLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
  return store;
}

async function run() {
  assert.equal(isPreservedOnSignOut('moa.pwa.installed'), true);
  assert.equal(isPreservedOnSignOut(STORAGE_KEYS.ONBOARDING_PROGRESS), true);
  assert.equal(isPreservedOnSignOut(`${STORAGE_KEYS.INITIALIZED}_org-a`), true);
  assert.equal(isBusinessCacheKey(`${STORAGE_KEYS.STUDENTS}_org-a`), true);
  assert.equal(isBusinessCacheKey('moa:pending-mutations:org-a'), true);
  assert.equal(isBusinessCacheKey('moa:sync-outbox:org-a'), true);
  assert.equal(isBusinessCacheKey('moa.pwa.installed'), false);
  assert.equal(isBusinessCacheKey(STORAGE_KEYS.ACTIVE_USER), false);

  const store = installMemoryLocalStorage();
  store.set(`${STORAGE_KEYS.STUDENTS}_org-a`, '[{"id":"stu-a"}]');
  store.set(`${STORAGE_KEYS.INVOICES}_org-b`, '[{"id":"inv-b"}]');
  store.set(STORAGE_KEYS.STUDENTS, '[{"id":"unscoped"}]');
  store.set('moa:pending-mutations:org-a', '{"v":2,"mutations":[]}');
  store.set('moa:sync-outbox:org-b', '{"v":2,"keys":[]}');
  store.set(STORAGE_KEYS.ACTIVE_USER, '{"id":"owner"}');
  store.set(STORAGE_KEYS.INITIALIZED, 'true');
  store.set(`${STORAGE_KEYS.ONBOARDING_PROGRESS}_org-a`, '{"step":1}');
  store.set('moa.pwa.installed', '1');
  store.set('moa.pwa.dismissUntil', '9');
  store.set('moa_current_organization_id', 'org-a');

  clearBusinessCachesOnSignOut();

  assert.equal(store.has(`${STORAGE_KEYS.STUDENTS}_org-a`), false);
  assert.equal(store.has(`${STORAGE_KEYS.INVOICES}_org-b`), false);
  assert.equal(store.has(STORAGE_KEYS.STUDENTS), false);
  assert.equal(store.has('moa:pending-mutations:org-a'), false);
  assert.equal(store.has('moa:sync-outbox:org-b'), false);
  assert.equal(store.get(STORAGE_KEYS.ACTIVE_USER), '{"id":"owner"}');
  assert.equal(store.get(STORAGE_KEYS.INITIALIZED), 'true');
  assert.equal(store.get(`${STORAGE_KEYS.ONBOARDING_PROGRESS}_org-a`), '{"step":1}');
  assert.equal(store.get('moa.pwa.installed'), '1');
  assert.equal(store.get('moa.pwa.dismissUntil'), '9');
  assert.equal(store.get('moa_current_organization_id'), 'org-a');

  // 1. pending 없음 + stale outbox key만 → 로그아웃 가능
  {
    setOrganizationId('org-clean');
    store.set('moa:pending-mutations:org-clean', '{"v":2,"nextRevision":0,"mutations":[]}');
    enqueueSyncOutbox(STORAGE_KEYS.STUDENTS);
    assert.equal(hasUncommittedMutationsOnDevice(), false);
    assert.equal(hasActionableSyncOutbox('org-clean'), false);
    let flushed = false;
    const status = await prepareBusinessSignOut({
      flush: async () => {
        flushed = true;
      },
    });
    assert.equal(status, 'ready');
    assert.equal(flushed, false);
  }

  // 2. pending 있음 + flush 성공 → 이후 업무 cache 삭제, device-only 유지
  {
    setOrganizationId('org-flush-ok');
    store.set('moa.pwa.installed', '1');
    store.set(`${STORAGE_KEYS.STUDENTS}_org-flush-ok`, '[{"id":"stu-1"}]');
    const written = markPendingUpsert(STORAGE_KEYS.STUDENTS, 'stu-1');
    assert.ok(written);
    assert.equal(hasUncommittedMutationsOnDevice(), true);
    const status = await prepareBusinessSignOut({
      flush: async () => {
        confirmServerCommit(STORAGE_KEYS.STUDENTS, written.revision);
      },
    });
    assert.equal(status, 'ready');
    assert.equal(peekPendingMutations('org-flush-ok').length, 0);
    clearBusinessCachesOnSignOut();
    assert.equal(store.has(`${STORAGE_KEYS.STUDENTS}_org-flush-ok`), false);
    assert.equal(store.has('moa:pending-mutations:org-flush-ok'), false);
    assert.equal(store.get('moa.pwa.installed'), '1');
  }

  // 3. pending 있음 + flush 실패 → 강제 로그아웃 전 업무 cache 유지
  {
    setOrganizationId('org-flush-fail');
    store.set(`${STORAGE_KEYS.STUDENTS}_org-flush-fail`, '[{"id":"stu-2"}]');
    const written = markPendingUpsert(STORAGE_KEYS.STUDENTS, 'stu-2');
    assert.ok(written);
    const status = await prepareBusinessSignOut({
      flush: async () => {
        throw new Error('failed to fetch');
      },
    });
    assert.equal(status, 'blocked');
    assert.equal(peekPendingMutations('org-flush-fail').length, 1);
    assert.equal(store.get(`${STORAGE_KEYS.STUDENTS}_org-flush-fail`), '[{"id":"stu-2"}]');
    assert.equal(store.has('moa:pending-mutations:org-flush-fail'), true);
  }

  // 4. device-only는 로그아웃 후에도 유지 (강제 삭제 시에도)
  {
    store.set(STORAGE_KEYS.ACTIVE_USER, '{"id":"owner"}');
    store.set('moa.pwa.dismissUntil', '9');
    clearBusinessCachesOnSignOut();
    assert.equal(store.get(STORAGE_KEYS.ACTIVE_USER), '{"id":"owner"}');
    assert.equal(store.get('moa.pwa.installed'), '1');
    assert.equal(store.get('moa.pwa.dismissUntil'), '9');
  }

  setOrganizationId(null);
  console.log('clearBusinessCaches.test.ts: ok');
}

void run();
