/**
 * 오프라인 pending mutation — hydrate overwrite / org 격리 / 충돌.
 * 실행: npm run test:pending-mutations
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STORAGE_KEYS } from './storageKeys';
import { setOrganizationId } from './storageContext';
import { writeLocal } from './localStorageEngine';
import {
  applyDirtyListMerge,
  clearPendingForKey,
  clearPendingForKeyUpTo,
  confirmServerCommit,
  hasPendingConflicts,
  hasPendingForKey,
  hasUncommittedMutations,
  markPendingConflict,
  markPendingDelete,
  markPendingFromSnapshot,
  markPendingUpsert,
  maxPendingRevision,
  mergeEntityListsById,
  peekPendingMutations,
  setMutationPersistState,
} from './pendingMutations';
import {
  compareMutationOrder,
  decideHydrateRow,
  isStaleMutation,
} from './mutationRecord';
import {
  enqueueSyncOutbox,
  enqueueSyncOutboxMutation,
  peekSyncOutbox,
  peekSyncOutboxMutations,
  clearSyncOutboxKeys,
} from './syncOutbox';
import { writeLocalRaw } from './localStorageEngine';

function installMemoryLocalStorage(): void {
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
      key() {
        return null;
      },
      get length() {
        return store.size;
      },
    },
    configurable: true,
  });
}

function run() {
  installMemoryLocalStorage();

  // 시나리오 A: 오프라인 예약 수정은 remote snapshot에 덮이지 않는다
  {
    const remote = [
      { id: 'bk-a', memo: 'remote' },
      { id: 'bk-b', memo: 'from-device-b' },
    ];
    const local = [{ id: 'bk-a', memo: 'offline-edit' }];
    const { merged, conflictIds } = mergeEntityListsById({ remote, local });
    assert.equal(merged.find((r) => r.id === 'bk-a')?.memo, 'offline-edit');
    assert.equal(merged.find((r) => r.id === 'bk-b')?.memo, 'from-device-b');
    assert.deepEqual(conflictIds, ['bk-a']);
  }

  // 시나리오 B: 오프라인 출결은 remote-only 행을 지우지 않고 local 입력을 유지
  {
    const remote = [{ id: 'att-remote', status: 'absent' }];
    const local = [
      { id: 'att-remote', status: 'absent' },
      { id: 'att-offline', status: 'present' },
    ];
    const { merged } = mergeEntityListsById({ remote, local });
    assert.equal(merged.some((r) => r.id === 'att-offline' && r.status === 'present'), true);
    assert.equal(merged.some((r) => r.id === 'att-remote'), true);
  }

  // 시나리오 C: 같은 entity 양쪽 수정 → 자동 remote overwrite 금지, conflict 표시
  {
    setOrganizationId('org-a');
    writeLocal(STORAGE_KEYS.SCHEDULES, [{ id: 'bk-a', memo: 'local' }]);
    markPendingUpsert(STORAGE_KEYS.SCHEDULES, 'bk-a');
    const merged = applyDirtyListMerge(STORAGE_KEYS.SCHEDULES, [{ id: 'bk-a', memo: 'other-device' }]);
    assert.equal(merged[0].memo, 'local');
    assert.equal(hasPendingConflicts('org-a'), true);
    clearPendingForKey(STORAGE_KEYS.SCHEDULES);
  }

  // 명시적 삭제 tombstone은 hydrate에서 다시 살리지 않음
  {
    const { merged } = mergeEntityListsById({
      remote: [{ id: 'bk-del' }, { id: 'bk-keep' }],
      local: [{ id: 'bk-keep' }],
      pendingDeleteIds: ['bk-del'],
    });
    assert.equal(merged.some((r) => r.id === 'bk-del'), false);
    assert.equal(merged.some((r) => r.id === 'bk-keep'), true);
  }

  // 시나리오 D: organization A pending은 B에 적용되지 않음
  {
    setOrganizationId('org-a');
    markPendingUpsert(STORAGE_KEYS.ATTENDANCE, 'att-a');
    assert.equal(hasPendingForKey(STORAGE_KEYS.ATTENDANCE, 'org-a'), true);
    assert.equal(hasPendingForKey(STORAGE_KEYS.ATTENDANCE, 'org-b'), false);
    setOrganizationId('org-b');
    assert.equal(peekPendingMutations('org-b').length, 0);
    assert.equal(hasPendingForKey(STORAGE_KEYS.ATTENDANCE), false);
    markPendingDelete(STORAGE_KEYS.SCHEDULES, 'bk-b');
    assert.equal(peekPendingMutations('org-a').some((m) => m.entityId === 'bk-b'), false);
    assert.equal(peekPendingMutations('org-b').some((m) => m.entityId === 'bk-b'), true);
  }

  markPendingConflict(STORAGE_KEYS.SCHEDULES, 'bk-b');
  assert.equal(hasPendingConflicts('org-b'), true);

  // 같은 entity 연속 mutation: identity + revision, 최신만 유지
  {
    setOrganizationId('org-rev');
    const first = markPendingUpsert(STORAGE_KEYS.SCHEDULES, 'bk-a');
    const second = markPendingUpsert(STORAGE_KEYS.SCHEDULES, 'bk-a');
    assert.ok(first && second);
    assert.notEqual(first.id, second.id);
    assert.ok(second.revision > first.revision);
    const rows = peekPendingMutations('org-rev').filter((row) => row.entityId === 'bk-a');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, second.id);
    assert.equal(isStaleMutation(first, second), true);
    assert.equal(isStaleMutation(second, first), false);
    assert.ok(compareMutationOrder(first, second) < 0);
  }

  // 오래된 persist revision은 최신 pending을 지우지 않는다
  {
    setOrganizationId('org-rev');
    const keptRevision = maxPendingRevision(STORAGE_KEYS.SCHEDULES);
    clearPendingForKeyUpTo(STORAGE_KEYS.SCHEDULES, keptRevision - 1);
    assert.equal(
      peekPendingMutations('org-rev').some((row) => row.entityId === 'bk-a'),
      true
    );
    clearPendingForKeyUpTo(STORAGE_KEYS.SCHEDULES, keptRevision);
    assert.equal(
      peekPendingMutations('org-rev').some((row) => row.entityId === 'bk-a'),
      false
    );
  }

  // dirty entity만 local 유지. 다른 entity의 remote 최신을 덮지 않는다
  {
    const { merged, conflictIds } = mergeEntityListsById({
      remote: [
        { id: 'bk-a', memo: 'remote-a' },
        { id: 'bk-b', memo: 'remote-b-new' },
      ],
      local: [
        { id: 'bk-a', memo: 'local-a' },
        { id: 'bk-b', memo: 'local-b-stale' },
      ],
      dirtyEntityIds: ['bk-a'],
      keyLevelDirty: false,
    });
    assert.equal(merged.find((row) => row.id === 'bk-a')?.memo, 'local-a');
    assert.equal(merged.find((row) => row.id === 'bk-b')?.memo, 'remote-b-new');
    assert.deepEqual(conflictIds, ['bk-a']);
  }

  // remote updatedAt이 더 새면 stale local mutation은 역전하지 않는다
  {
    const stalePending = {
      id: 'mut-stale',
      key: STORAGE_KEYS.SCHEDULES,
      kind: 'upsert' as const,
      entityId: 'bk-old',
      revision: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
      persistState: 'pending' as const,
    };
    assert.equal(
      decideHydrateRow({
        local: { id: 'bk-old', memo: 'offline-old', updatedAt: '2026-01-01T00:00:00.000Z' },
        remote: { id: 'bk-old', memo: 'server-new', updatedAt: '2026-09-24T00:00:00.000Z' },
        pending: stalePending,
      }),
      'keep_remote'
    );
    const { merged, staleDroppedIds } = mergeEntityListsById({
      remote: [{ id: 'bk-old', memo: 'server-new', updatedAt: '2026-09-24T00:00:00.000Z' }],
      local: [{ id: 'bk-old', memo: 'offline-old', updatedAt: '2026-01-01T00:00:00.000Z' }],
      dirtyEntityIds: ['bk-old'],
      pendingByEntityId: new Map([['bk-old', stalePending]]),
    });
    assert.equal(merged[0].memo, 'server-new');
    assert.deepEqual(staleDroppedIds, ['bk-old']);
  }

  // snapshot diff: 같은 목록에서 바뀐 id만 upsert
  {
    setOrganizationId('org-diff');
    markPendingFromSnapshot(
      STORAGE_KEYS.SCHEDULES,
      [
        { id: 'bk-1', memo: 'a' },
        { id: 'bk-2', memo: 'b' },
      ],
      [
        { id: 'bk-1', memo: 'a-edit' },
        { id: 'bk-2', memo: 'b' },
      ]
    );
    const diffs = peekPendingMutations('org-diff').filter((row) => row.key === STORAGE_KEYS.SCHEDULES);
    assert.equal(diffs.some((row) => row.entityId === 'bk-1' && row.kind === 'upsert'), true);
    assert.equal(diffs.some((row) => row.entityId === 'bk-2'), false);
  }

  // outbox v1 StorageKey[] 호환 + 오래된 mutation enqueue 거부
  {
    setOrganizationId('org-outbox');
    writeLocalRaw('moa:sync-outbox:org-outbox', JSON.stringify([STORAGE_KEYS.SCHEDULES]));
    assert.deepEqual(peekSyncOutbox(), [STORAGE_KEYS.SCHEDULES]);
    enqueueSyncOutbox(STORAGE_KEYS.SESSION_PASSES);
    enqueueSyncOutboxMutation({
      id: 'mut-1',
      key: STORAGE_KEYS.SCHEDULES,
      kind: 'upsert',
      entityId: 'bk-a',
      revision: 2,
      enqueuedAt: '2026-09-24T01:00:00.000Z',
    });
    enqueueSyncOutboxMutation({
      id: 'mut-0',
      key: STORAGE_KEYS.SCHEDULES,
      kind: 'upsert',
      entityId: 'bk-a',
      revision: 1,
      enqueuedAt: '2026-09-24T00:00:00.000Z',
    });
    const queued = peekSyncOutboxMutations().filter((row) => row.entityId === 'bk-a');
    assert.equal(queued.length, 1);
    assert.equal(queued[0].id, 'mut-1');
    assert.equal(queued[0].revision, 2);
    clearSyncOutboxKeys([STORAGE_KEYS.SCHEDULES], 2);
    assert.equal(
      peekSyncOutboxMutations().some((row) => row.entityId === 'bk-a'),
      false
    );
  }

  // local write ≠ server commit. 실패해도 pending이 사라지지 않는다
  {
    setOrganizationId('org-commit');
    const written = markPendingUpsert(STORAGE_KEYS.SCHEDULES, 'bk-commit');
    assert.ok(written);
    assert.equal(written.persistState, 'local');
    assert.equal(hasUncommittedMutations('org-commit'), true);
    setMutationPersistState(STORAGE_KEYS.SCHEDULES, 'failed');
    const failed = peekPendingMutations('org-commit').find((row) => row.entityId === 'bk-commit');
    assert.equal(failed?.persistState, 'failed');
    assert.equal(hasUncommittedMutations('org-commit'), true);
    confirmServerCommit(STORAGE_KEYS.SCHEDULES, failed?.revision ?? 0);
    assert.equal(
      peekPendingMutations('org-commit').some((row) => row.entityId === 'bk-commit'),
      false
    );
    assert.equal(hasUncommittedMutations('org-commit'), false);
  }

  const here = dirname(fileURLToPath(import.meta.url));
  const adapter = readFileSync(join(here, 'supabaseAdapter.ts'), 'utf8');
  const setItemFn = adapter.slice(adapter.indexOf('setItem<T>'), adapter.indexOf('writeLocalMirror<T>'));
  assert.match(setItemFn, /markPendingFromSnapshot/);
  assert.match(setItemFn, /enqueueUncommitted/);
  assert.doesNotMatch(setItemFn, /confirmServerCommit/);
  assert.doesNotMatch(setItemFn, /clearPendingForKey/);
  assert.match(adapter, /enqueueSyncOutbox/);
  assert.match(adapter, /maxPendingRevision/);
  assert.match(adapter, /confirmServerCommit/);
  assert.match(adapter, /rememberPersistFailure/);
  assert.match(adapter, /enqueueSyncOutboxMutation/);
  assert.doesNotMatch(adapter, /markPendingUpsert\(key\)/);

  const hydrator = readFileSync(join(here, '../../StorageHydrator.tsx'), 'utf8');
  assert.match(hydrator, /addEventListener\('online'/);
  assert.match(hydrator, /flushSyncOutbox/);
  assert.match(hydrator, /runQuietRehydrate/);
  assert.equal(hydrator.includes('if (!isNativeApp()) return'), false);

  const hydrate = readFileSync(join(here, 'sync/coreEntityHydrate.ts'), 'utf8');
  assert.match(hydrate, /applyDirtyListMerge\(STORAGE_KEYS\.SCHEDULES/);
  assert.match(hydrate, /applyDirtyListMerge\(STORAGE_KEYS\.SESSION_PASSES/);

  const pianoHydrate = readFileSync(join(here, 'sync/pianoEntitySync.ts'), 'utf8');
  assert.match(pianoHydrate, /applyDirtyListMerge\(/);
  assert.match(pianoHydrate, /STORAGE_KEYS\.ATTENDANCE/);

  setOrganizationId(null);
  console.log('pendingMutations.test.ts: ok');
}

run();
