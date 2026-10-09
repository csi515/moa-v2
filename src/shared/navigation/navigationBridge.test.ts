/**
 * Unit tests for navigationBridge & useAppNavigation
 * Run: npx tsx src/shared/navigation/navigationBridge.test.ts
 */

import assert from 'node:assert/strict';
import {
  bindNavigationBridge,
  unbindNavigationBridge,
  getActiveTab,
  setActiveTab,
  getSelectedStudentId,
  setSelectedStudentId,
  openStudent,
  subscribeNavigationBridge,
} from './navigationBridge';
import type { NavTab, StudentDetailTab } from './navigationTypes';

console.log('[TEST] navigationBridge suite starting...');

// 1. Initial unbound fallback
unbindNavigationBridge();
assert.equal(getActiveTab(), 'dashboard');
assert.equal(getSelectedStudentId(), null);

// 2. Binding mock API
let currentTab: NavTab = 'dashboard';
let currentStudentId: string | null = null;
let currentDetailTab: StudentDetailTab | null = null;
let changeNotifyCount = 0;

const unsubscribe = subscribeNavigationBridge(() => {
  changeNotifyCount++;
});

bindNavigationBridge({
  getActiveTab: () => currentTab,
  setActiveTab: (tab) => {
    currentTab = tab;
  },
  getSelectedStudentId: () => currentStudentId,
  setSelectedStudentId: (id) => {
    currentStudentId = id;
  },
  getSelectedStudentDetailTab: () => currentDetailTab,
  setSelectedStudentDetailTab: (t) => {
    currentDetailTab = t;
  },
  openStudent: (studentId, tab) => {
    currentStudentId = studentId;
    if (tab) currentDetailTab = tab;
    currentTab = 'students';
  },
});

assert.ok(changeNotifyCount > 0, 'Listener should have been called upon binding');

// 3. Tab navigation
setActiveTab('attendance');
assert.equal(getActiveTab(), 'attendance');
assert.equal(currentTab, 'attendance');

// 4. Student navigation
setSelectedStudentId('stud-123');
assert.equal(getSelectedStudentId(), 'stud-123');

openStudent('stud-456', 'classes');
assert.equal(getActiveTab(), 'students');
assert.equal(getSelectedStudentId(), 'stud-456');
assert.equal(currentDetailTab, 'classes');

unsubscribe();
console.log('✓ Navigation bridge binding and dispatching passed');

console.log('[TEST] navigationBridge ALL TESTS PASSED!');
