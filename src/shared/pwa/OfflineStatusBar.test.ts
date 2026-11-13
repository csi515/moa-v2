/**
 * OfflineStatusBar Contract Tests
 * 
 * 실행: npx tsx src/shared/pwa/OfflineStatusBar.test.ts
 */

import assert from 'node:assert/strict';
import { OfflineStatusBar } from './OfflineStatusBar';
import {
  getNetworkStatus,
  handleNetworkStateChange,
  clearNetworkListeners,
} from './networkStatus';

function runOfflineStatusBarTests() {
  console.log('Running OfflineStatusBar unit tests...');

  // 1. 컴포넌트 함수 정의 및 export 검증
  assert.equal(typeof OfflineStatusBar, 'function', 'OfflineStatusBar는 유효한 React 함수형 컴포넌트여야 함');

  // 2. 네트워크 상태 전환과 오프라인 감지 이벤트 계약 검증
  clearNetworkListeners();
  handleNetworkStateChange(true);
  assert.equal(getNetworkStatus().isOnline, true);

  // 오프라인 전환
  handleNetworkStateChange(false);
  assert.equal(getNetworkStatus().isOnline, false, '네트워크 두절 상태가 올바르게 기록되어야 함');

  // 온라인 복구
  handleNetworkStateChange(true);
  assert.equal(getNetworkStatus().isOnline, true, '네트워크 재연결 상태가 올바르게 기록되어야 함');

  clearNetworkListeners();
  console.log('OfflineStatusBar.test.ts: ok (all offline status bar contract tests passed)');
}

runOfflineStatusBarTests();
