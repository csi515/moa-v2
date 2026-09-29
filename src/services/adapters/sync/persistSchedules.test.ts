/**
 * 예약 persist — stale snapshot이 원격 예약을 diff-delete 하지 않는지.
 * 실행: npm run test:persist-schedules
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { persistSchedules } from './corePersistCatalog';
import { STORAGE_KEYS } from '../storageKeys';
import { setOrganizationId } from '../storageContext';
import { markPendingDelete } from '../pendingMutations';
import type { Booking } from '../../../core/types/schedule';
import type { SyncCache } from './syncTypes';

function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  const memory = {
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
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: memory,
    configurable: true,
  });
}

function booking(id: string, memo = 'a'): Booking {
  return {
    id,
    customerId: 'cust-1',
    customerName: '학생A',
    startsAt: '2026-09-24T01:00:00.000Z',
    endsAt: '2026-09-24T02:00:00.000Z',
    status: 'scheduled',
    memo,
  };
}

function cacheOf(bookings: Booking[]): SyncCache {
  const map = new Map<string, unknown>([[STORAGE_KEYS.SCHEDULES, bookings]]);
  return {
    get<T>(key: string) {
      return map.get(key) as T | undefined;
    },
    set<T>(key: string, value: T) {
      map.set(key, value);
    },
    delete(key: string) {
      map.delete(key);
    },
    has(key: string) {
      return map.has(key);
    },
  };
}

function createScheduleClient() {
  const upserted: Array<{ organization_id: string; id: string }> = [];
  const deleted: Array<{ organization_id?: string; ids?: string[]; otherOrg?: boolean }> = [];

  const client = {
    from(table: string) {
      assert.equal(table, 'schedules');
      return {
        upsert(row: { organization_id: string; id: string }) {
          upserted.push({ organization_id: row.organization_id, id: row.id });
          return Promise.resolve({ error: null });
        },
        delete() {
          const ctx: { organization_id?: string } = {};
          const chain = {
            eq(col: string, value: string) {
              if (col === 'organization_id') ctx.organization_id = value;
              else if (col !== 'id') {
                deleted.push({ otherOrg: true });
              }
              return chain;
            },
            in(col: string, ids: string[]) {
              assert.equal(col, 'id');
              deleted.push({ organization_id: ctx.organization_id, ids });
              return Promise.resolve({ error: null });
            },
          };
          return chain;
        },
      };
    },
  };

  return { client, upserted, deleted };
}

async function run() {
  installMemoryLocalStorage();
  const orgA = 'org-a';
  const orgB = 'org-b';
  setOrganizationId(orgA);

  const catalogSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'corePersistCatalog.ts'), 'utf8');
  const persistFn = catalogSource.slice(
    catalogSource.indexOf('export async function persistSchedules'),
    catalogSource.indexOf('export async function persistConsultations')
  );
  assert.equal(persistFn.includes('syncTable'), false);
  assert.equal(persistFn.includes('upsertThenDiffDelete'), false);
  assert.match(persistFn, /runRowUpserts/);
  assert.match(persistFn, /pendingDeleteIds/);

  const scheduleStorageSource = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../storage/scheduleStorage.ts'),
    'utf8'
  );
  assert.match(scheduleStorageSource, /upsertRemoteSchedule/);
  assert.match(scheduleStorageSource, /deleteRemoteSchedule/);
  assert.match(scheduleStorageSource, /markPendingUpsert/);
  assert.match(scheduleStorageSource, /markPendingDelete/);

  const rowMutations = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), 'scheduleRowMutations.ts'),
    'utf8'
  );
  assert.match(rowMutations, /\.upsert\(/);
  assert.match(rowMutations, /\.delete\(\)/);
  assert.match(rowMutations, /organization_id/);
  assert.equal(rowMutations.includes('upsertThenDiffDelete'), false);

  // 로컬에는 A만(stale). 원격에는 A+B 가 있어도 persist는 A upsert만.
  {
    const { client, upserted, deleted } = createScheduleClient();
    const ok = await persistSchedules(client as never, orgA, cacheOf([booking('bk-a', 'edited')]), () => false);
    assert.equal(ok, true);
    assert.deepEqual(
      upserted.map((r) => r.id),
      ['bk-a']
    );
    assert.equal(upserted[0].organization_id, orgA);
    assert.deepEqual(deleted, [], 'stale 목록으로 원격 예약 B를 지우면 안 된다');
  }

  // 명시적 삭제 tombstone만 org 스코프로 삭제
  {
    const { client, upserted, deleted } = createScheduleClient();
    markPendingDelete(STORAGE_KEYS.SCHEDULES, 'bk-a');
    const ok = await persistSchedules(client as never, orgA, cacheOf([]), () => false);
    assert.equal(ok, true);
    assert.deepEqual(upserted, []);
    assert.equal(deleted.length, 1);
    assert.deepEqual(deleted[0].ids, ['bk-a']);
    assert.equal(deleted[0].organization_id, orgA);
    assert.notEqual(deleted[0].organization_id, orgB);
  }

  // 다른 organization persist는 orgB row만 다룸
  {
    setOrganizationId(orgB);
    const { client, upserted, deleted } = createScheduleClient();
    const ok = await persistSchedules(client as never, orgB, cacheOf([booking('bk-b-org')]), () => false);
    assert.equal(ok, true);
    assert.equal(upserted[0].organization_id, orgB);
    assert.deepEqual(deleted, []);
    assert.equal(
      upserted.some((r) => r.organization_id === orgA),
      false
    );
  }

  setOrganizationId(null);
  console.log('persistSchedules.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
