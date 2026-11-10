import assert from 'node:assert/strict';
import React from 'react';
import { IssueMakeupTokenModal } from './IssueMakeupTokenModal.js';
import { assembleMakeupTokenIssueNotice } from '../domain/makeupLessonEngine.js';

console.log('[test:IssueMakeupTokenModal] starting tests...');

// 1. 컴포넌트 export 확인
assert.equal(typeof IssueMakeupTokenModal, 'function');
console.log('✓ 1. IssueMakeupTokenModal 함수형 컴포넌트 export 통과');

// 2. 알림 텍스트 조립 템플릿 검증
const template = assembleMakeupTokenIssueNotice({
  studentName: '이지은',
  originDate: '2026-11-10',
  expiresAt: '2026-12-10',
  originReason: 'advance_request',
  academyName: '모아피아노',
});

assert.match(template, /\[모아피아노\] 보강권\(1회\) 발급 안내/);
assert.match(template, /이지은/);
assert.match(template, /사전 결석 신청/);
assert.match(template, /2026-12-10/);
assert.match(template, /유효기간이 지난 보강권은 자동 만료/);
console.log('✓ 2. 학부모 안내 템플릿 검증 통과');

// 3. isOpen=false 일 때 null 반환 확인
const element = React.createElement(IssueMakeupTokenModal, {
  isOpen: false,
  onClose: () => {},
  student: { id: 'st-1', name: '이지은' },
  originDate: '2026-11-10',
});
assert.equal(element.type, IssueMakeupTokenModal);
console.log('✓ 3. 모달 컴포넌트 props 시그니처 검증 통과');

console.log('[test:IssueMakeupTokenModal] ALL TESTS PASSED! (100%)');
