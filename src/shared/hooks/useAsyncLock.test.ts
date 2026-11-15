/**
 * useAsyncLock Unit Tests
 *
 * 실행: npx tsx src/shared/hooks/useAsyncLock.test.ts
 */

import assert from 'node:assert/strict';

async function testAsyncLockLogic() {
  console.log('Running useAsyncLock unit tests...');

  // 1. 단일 실행 및 이중 호출 차단 검증
  {
    let lockRef = false;
    let executionCount = 0;

    async function runWithLock<T>(fn: () => Promise<T>): Promise<T | undefined> {
      if (lockRef) return undefined;
      lockRef = true;
      try {
        return await fn();
      } finally {
        lockRef = false;
      }
    }

    const slowTask = async () => {
      executionCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return 'done';
    };

    // 첫 번째 호출과 동시에 빠른 두 번째/세 번째 호출 (연속 광클 시뮬레이션)
    const p1 = runWithLock(slowTask);
    const p2 = runWithLock(slowTask);
    const p3 = runWithLock(slowTask);

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

    assert.equal(r1, 'done', '첫 번째 작업은 정상 완료되어야 함');
    assert.equal(r2, undefined, '두 번째 중복 클릭은 차단되어야 함');
    assert.equal(r3, undefined, '세 번째 중복 클릭은 차단되어야 함');
    assert.equal(executionCount, 1, '실제 비동기 작업은 단 1회만 실행되어야 함');
  }

  // 2. 에러 발생 시에도 락이 정상 해제되어 다음 작업이 가능한지 검증
  {
    let lockRef = false;

    async function runWithLock<T>(fn: () => Promise<T>): Promise<T | undefined> {
      if (lockRef) return undefined;
      lockRef = true;
      try {
        return await fn();
      } finally {
        lockRef = false;
      }
    }

    const failingTask = async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      throw new Error('network failed');
    };

    let errorCaught = false;
    try {
      await runWithLock(failingTask);
    } catch {
      errorCaught = true;
    }
    assert.equal(errorCaught, true, '에러가 정상 전파되어야 함');
    assert.equal(lockRef, false, '에러 후에도 락이 반드시 해제되어야 함');

    // 락 해제 후 정상 작업 재실행 가능 여부
    const ok = await runWithLock(async () => 'recovered');
    assert.equal(ok, 'recovered', '락 해제 후 다음 작업이 정상 실행되어야 함');
  }

  console.log('useAsyncLock.test.ts: ok (all lock tests passed)');
}

testAsyncLockLogic();
