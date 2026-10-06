import assert from 'node:assert/strict';
import {
  computeTargetWorkspaceUrl,
  resolveTabFromUrl,
} from './useWorkspaceUrlSync';

async function runTests() {
  // Test 1: computeTargetWorkspaceUrl 매핑 검증
  {
    assert.equal(computeTargetWorkspaceUrl('dashboard'), '/workspace');
    assert.equal(computeTargetWorkspaceUrl('students'), '/workspace/students');
    assert.equal(computeTargetWorkspaceUrl('timetable'), '/workspace/timetable');
    assert.equal(computeTargetWorkspaceUrl('tuition'), '/workspace/tuition');
    assert.equal(computeTargetWorkspaceUrl('settings'), '/workspace/settings');
  }

  // Test 2: resolveTabFromUrl 매핑 검증 (URL -> Tab)
  {
    // urlTab 우선
    assert.equal(resolveTabFromUrl('students', '/workspace/students'), 'students');
    assert.equal(resolveTabFromUrl('settings', '/workspace/settings'), 'settings');

    // 루트 및 워크스페이스 기본 경로
    assert.equal(resolveTabFromUrl(undefined, '/'), 'dashboard');
    assert.equal(resolveTabFromUrl(undefined, '/workspace'), 'dashboard');

    // 기타 경로
    assert.equal(resolveTabFromUrl(undefined, '/login'), null);
  }

  console.log('useWorkspaceUrlSync.test.ts: all tests passed! (100% OK)');
}

runTests().catch((err) => {
  console.error('useWorkspaceUrlSync.test.ts failed:', err);
  process.exit(1);
});
