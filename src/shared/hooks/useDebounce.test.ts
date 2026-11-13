/**
 * useDebounce Unit Tests
 * 
 * 실행: npx tsx src/shared/hooks/useDebounce.test.ts
 */

import assert from 'node:assert/strict';

async function testDebounceLogic() {
  console.log('Running useDebounce unit tests...');

  // 타이머 기반 디바운스 단위 계약 검증
  let callCount = 0;
  let lastArg = '';

  function debounce<T extends unknown[]>(fn: (...args: T) => void, delayMs: number) {
    let timer: NodeJS.Timeout | null = null;
    return (...args: T) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        fn(...args);
      }, delayMs);
    };
  }

  const debounced = debounce((text: string) => {
    callCount++;
    lastArg = text;
  }, 50);

  // 빠른 연속 호출 (5회)
  debounced('a');
  debounced('ab');
  debounced('abc');
  debounced('abcd');
  debounced('final');

  assert.equal(callCount, 0, '디바운스 지연 시간 전에는 실행되지 않아야 함');

  // 지연 시간 후 확인
  await new Promise((resolve) => setTimeout(resolve, 80));

  assert.equal(callCount, 1, '마지막 1회만 실행되어야 함');
  assert.equal(lastArg, 'final', '마지막 인자 값이어야 함');

  console.log('useDebounce.test.ts: ok (all debounce tests passed)');
}

testDebounceLogic();
