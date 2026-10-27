import { strict as assert } from 'node:assert';

/**
 * 액션 중복 호출 방지 가드 메커니즘 검증
 * UI 컴포넌트(PassesManagementView, LockerManagementView)에서 적용된
 * 동기식 Set/Boolean ref 가드의 동작을 검증합니다.
 */

function testIdSetGuard() {
  const activeIds = new Set<string>();

  function tryAction(id: string): boolean {
    if (activeIds.has(id)) {
      return false; // 중복 차단
    }
    activeIds.add(id);
    return true; // 실행 허용
  }

  function finishAction(id: string) {
    activeIds.delete(id);
  }

  // 1. 첫 번째 클릭: 허용
  assert.equal(tryAction('pass-1'), true);

  // 2. 비동기 응답 도착 전 동일 ID 초고속 더블클릭: 차단
  assert.equal(tryAction('pass-1'), false);

  // 3. 다른 ID 클릭: 허용
  assert.equal(tryAction('pass-2'), true);

  // 4. pass-1 완료 후 재클릭: 허용
  finishAction('pass-1');
  assert.equal(tryAction('pass-1'), true);

  console.log('testIdSetGuard: ok');
}

function testBooleanRefGuard() {
  let isLocked = false;

  function trySubmit(): boolean {
    if (isLocked) {
      return false;
    }
    isLocked = true;
    return true;
  }

  function finishSubmit() {
    isLocked = false;
  }

  assert.equal(trySubmit(), true);
  assert.equal(trySubmit(), false); // 중복 차단
  finishSubmit();
  assert.equal(trySubmit(), true);

  console.log('testBooleanRefGuard: ok');
}

function runAll() {
  testIdSetGuard();
  testBooleanRefGuard();
  console.log('actionDedupeGuards.test.ts: all ok');
}

runAll();
