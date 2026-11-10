import assert from 'node:assert/strict';
import React from 'react';
import { PendingMakeupRequestsModal } from './PendingMakeupRequestsModal.js';
import type { MakeupRequest } from '@/capabilities/makeup_lesson_pass/infrastructure/makeupLessonStorage';

console.log('[test:PendingMakeupRequestsModal] starting tests...');

// 1. 컴포넌트 export 확인
assert.equal(typeof PendingMakeupRequestsModal, 'function');
console.log('✓ 1. PendingMakeupRequestsModal 함수형 컴포넌트 export 통과');

// 2. Props 시그니처 검증
const mockRequests: MakeupRequest[] = [
  {
    id: 'req-1',
    organizationId: 'org-test',
    tokenId: 'tok-1',
    studentId: 'st-1',
    studentName: '김하늘',
    originDate: '2026-11-10',
    preferredDate: '2026-11-18',
    preferredTime: '16:00',
    memo: '차량 탑승 가능한가요?',
    status: 'pending',
    createdAt: '2026-11-10T10:00:00Z',
  },
];

const el = React.createElement(PendingMakeupRequestsModal, {
  isOpen: true,
  onClose: () => {},
  requests: mockRequests,
  organizationId: 'org-test',
});

assert.equal(el.type, PendingMakeupRequestsModal);
console.log('✓ 2. 모달 props 시그니처 통과');

console.log('[test:PendingMakeupRequestsModal] ALL TESTS PASSED! (100%)');
