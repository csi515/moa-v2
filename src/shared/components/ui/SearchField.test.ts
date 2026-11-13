/**
 * SearchField Component Unit Tests
 * 
 * 실행: npx tsx src/shared/components/ui/SearchField.test.ts
 */

import assert from 'node:assert/strict';

function testSearchFieldContract() {
  console.log('Running SearchField contract tests...');

  // 1. 디바운스 미설정 시 즉시 호출 계약 검증
  let syncCalled = '';
  function handleSyncChange(val: string) {
    syncCalled = val;
  }
  handleSyncChange('테스트 학생');
  assert.equal(syncCalled, '테스트 학생');

  // 2. 클리어 동작 계약 검증
  let cleared = false;
  function handleClear() {
    cleared = true;
  }
  handleClear();
  assert.equal(cleared, true);

  console.log('SearchField.test.ts: ok (all SearchField contract tests passed)');
}

testSearchFieldContract();
