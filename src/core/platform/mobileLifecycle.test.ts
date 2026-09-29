/**
 * 모바일 lifecycle 순수 헬퍼 테스트
 * 실행: npm run test:mobile-lifecycle
 */
import assert from 'node:assert/strict';
import { shouldRefreshSession } from './mobileLifecyclePolicy';

function run(): void {
  const now = 1_000_000;

  assert.equal(shouldRefreshSession(undefined, now), true);
  assert.equal(shouldRefreshSession(null, now), true);
  assert.equal(shouldRefreshSession(now + 60, now, 300), true);
  assert.equal(shouldRefreshSession(now + 301, now, 300), false);
  assert.equal(shouldRefreshSession(now + 300, now, 300), true);

  console.log('mobileLifecycle.test.ts: all assertions passed');
}

run();
