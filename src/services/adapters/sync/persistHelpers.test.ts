/**
 * sync persistHelpers — 부분 upsert 실패 전파 unit test
 * 실행: npm run test:sync-persist-helpers
 */
import assert from 'node:assert/strict';
import {
  runRowUpserts,
  upsertThenDiffDelete,
  upsertThenDiffDeleteByKeys,
} from './persistHelpers';

async function run() {
  // runRowUpserts: 전부 성공 → true
  {
    const ok = await runRowUpserts(
      [1, 2, 3],
      () => false,
      async () => ({ error: null }),
      () => {
        throw new Error('should not log');
      }
    );
    assert.equal(ok, true);
  }

  // runRowUpserts: 중간 실패해도 나머지 계속, 결과는 false
  {
    const seen: number[] = [];
    const ok = await runRowUpserts(
      [1, 2, 3],
      () => false,
      async (n) => {
        seen.push(n);
        return { error: n === 2 ? new Error('row 2 failed') : null };
      },
      () => undefined
    );
    assert.equal(ok, false);
    assert.deepEqual(seen, [1, 2, 3], '실패 후에도 나머지 row 계속');
  }

  // upsertThenDiffDelete: upsert 실패 시 delete 호출 없이 false
  {
    let deleteCalled = false;
    const ok = await upsertThenDiffDelete({
      context: 'test',
      cachePresent: true,
      currentIds: ['a', 'b'],
      upsertAll: async () => false,
      fetchRemoteIds: async () => {
        throw new Error('fetch should not run after upsert fail');
      },
      deleteIds: async () => {
        deleteCalled = true;
        return { error: null };
      },
    });
    assert.equal(ok, false);
    assert.equal(deleteCalled, false);
  }

  // upsertThenDiffDelete: upsert 성공 + delete 성공 → true
  {
    const ok = await upsertThenDiffDelete({
      context: 'test',
      cachePresent: true,
      currentIds: ['a', 'b'],
      upsertAll: async () => true,
      fetchRemoteIds: async () => ({ ids: ['a', 'b', 'c'], error: null }),
      deleteIds: async (ids) => {
        assert.deepEqual(ids, ['c']);
        return { error: null };
      },
    });
    assert.equal(ok, true);
  }

  // stale snapshot: cache.has만으로는 삭제하지 않는다
  {
    let deleteCalled = false;
    let fetchCalled = false;
    const ok = await upsertThenDiffDelete({
      context: 'stale-schedules',
      cachePresent: true,
      snapshotComplete: false,
      currentIds: ['booking-a'],
      upsertAll: async () => true,
      fetchRemoteIds: async () => {
        fetchCalled = true;
        return { ids: ['booking-a', 'booking-b'], error: null };
      },
      deleteIds: async () => {
        deleteCalled = true;
        return { error: null };
      },
    });
    assert.equal(ok, true);
    assert.equal(fetchCalled, false, '불완전 snapshot은 remote id를 조회해 지우지 않는다');
    assert.equal(deleteCalled, false, '원격 예약 B를 삭제하면 안 된다');
  }

  // upsertThenDiffDeleteByKeys: upsert 실패 → false, delete 생략
  {
    let deleteKeyCalled = false;
    const ok = await upsertThenDiffDeleteByKeys({
      context: 'test-keys',
      cachePresent: true,
      currentKeys: ['p:s'],
      upsertAll: async () => false,
      fetchRemoteKeys: async () => {
        throw new Error('fetch should not run');
      },
      deleteKey: async () => {
        deleteKeyCalled = true;
        return { error: null };
      },
    });
    assert.equal(ok, false);
    assert.equal(deleteKeyCalled, false);
  }

  console.log('persistHelpers.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
