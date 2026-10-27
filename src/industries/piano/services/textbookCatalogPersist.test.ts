/**
 * 교재 마스터 Core 실패 시 local 롤백
 * 실행: npm run test:textbook-catalog-persist
 */
import assert from 'node:assert/strict';
import {
  commitLocalThenRemote,
  resolveTextbookCatalogMode,
} from './textbookCatalogPersist';

async function run() {
  assert.equal(resolveTextbookCatalogMode(true), 'core');
  assert.equal(resolveTextbookCatalogMode(false), 'local_demo');

  // Core/remote 성공 → local 유지
  {
    let local = 'before';
    const result = await commitLocalThenRemote({
      commitLocal: () => {
        local = 'committed';
      },
      rollbackLocal: () => {
        local = 'rolled-back';
      },
      runRemote: async () => 'ok',
    });
    assert.equal(result, 'ok');
    assert.equal(local, 'committed');
  }

  // Core/remote 실패 → local 롤백 + throw
  {
    let local = 'before';
    await assert.rejects(
      () =>
        commitLocalThenRemote({
          commitLocal: () => {
            local = 'committed';
          },
          rollbackLocal: () => {
            local = 'before';
          },
          runRemote: async () => {
            throw new Error('core product save failed');
          },
        }),
      /core product save failed/
    );
    assert.equal(local, 'before');
  }

  // rollback 자체 실패해도 원본 에러를 유지
  {
    await assert.rejects(
      () =>
        commitLocalThenRemote({
          commitLocal: () => undefined,
          rollbackLocal: () => {
            throw new Error('rollback blew up');
          },
          runRemote: async () => {
            throw new Error('remote failed');
          },
        }),
      /remote failed/
    );
  }

  console.log('textbookCatalogPersist.test.ts: ok');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
