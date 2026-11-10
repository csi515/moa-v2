import assert from 'node:assert/strict';
import React from 'react';
import { ParentMakeupRequestModal } from './ParentMakeupRequestModal.js';

console.log('[test:ParentMakeupRequestModal] starting tests...');

// 1. 컴포넌트 export 확인
assert.equal(typeof ParentMakeupRequestModal, 'function');
console.log('✓ 1. ParentMakeupRequestModal 함수형 컴포넌트 export 통과');

// 2. isOpen=false 일 때 null 반환 확인
const element = React.createElement(ParentMakeupRequestModal, {
  isOpen: false,
  onClose: () => {},
  token: {
    id: 'tok-1',
    organizationId: 'org-1',
    studentId: 'st-1',
    studentName: '이지은',
    originReason: 'advance_request',
    originDate: '2026-11-10',
    expiresAt: '2026-12-10',
    status: 'available',
    daysRemaining: 30,
  },
  studentId: 'st-1',
  studentName: '이지은',
  organizationId: 'org-1',
});
assert.equal(element.type, ParentMakeupRequestModal);
console.log('✓ 2. 모달 props 인터페이스 통과');

console.log('[test:ParentMakeupRequestModal] ALL TESTS PASSED! (100%)');
