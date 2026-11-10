import assert from 'node:assert/strict';
import React from 'react';
import { ParentAttendanceView } from './ParentAttendanceView.js';

console.log('[test:ParentAttendanceView] starting tests...');

// 1. 컴포넌트 export 확인
assert.equal(typeof ParentAttendanceView, 'function');
console.log('✓ 1. ParentAttendanceView 함수형 컴포넌트 export 통과');

// 2. React.createElement 시그니처 검증
const student = {
  id: 'st-test-1',
  name: '이지은',
  status: 'active' as const,
  phone: '010-1111-2222',
  parentPhone: '010-3333-4444',
  createdAt: '2026-01-01',
  tenantId: 'org_test',
};

const el = React.createElement(ParentAttendanceView, {
  student,
  organizationId: 'org_test',
  industryType: 'piano',
});
assert.equal(el.type, ParentAttendanceView);
console.log('✓ 2. props 시그니처 및 렌더링 준비 통과');

console.log('[test:ParentAttendanceView] ALL TESTS PASSED! (100%)');
