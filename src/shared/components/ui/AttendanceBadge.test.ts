import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AttendanceBadge } from './AttendanceBadge.js';

console.log('[test:AttendanceBadge] starting tests...');

// 1. 출석 배지 렌더링 검증
const presentHtml = renderToStaticMarkup(
  React.createElement(AttendanceBadge, { status: 'present' })
);
assert.match(presentHtml, /출석/);
assert.match(presentHtml, /text-emerald-700/);
assert.match(presentHtml, /bg-emerald-50/);
console.log('✓ 1. 출석 배지 렌더링 통과');

// 2. 결석 배지 렌더링 검증
const absentHtml = renderToStaticMarkup(
  React.createElement(AttendanceBadge, { status: 'absent' })
);
assert.match(absentHtml, /결석/);
assert.match(absentHtml, /text-rose-700/);
assert.match(absentHtml, /bg-rose-50/);
console.log('✓ 2. 결석 배지 렌더링 통과');

// 3. 아이콘 옵션 및 커스텀 라벨 검증
const customHtml = renderToStaticMarkup(
  React.createElement(AttendanceBadge, {
    status: 'late',
    showIcon: true,
    customLabel: '15분 지각',
  })
);
assert.match(customHtml, /15분 지각/);
assert.match(customHtml, /text-amber-700/);
console.log('✓ 3. 커스텀 라벨 및 아이콘 옵션 통과');

console.log('[test:AttendanceBadge] ALL TESTS PASSED! (100%)');
