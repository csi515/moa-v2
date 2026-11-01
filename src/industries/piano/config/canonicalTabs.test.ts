import assert from 'node:assert/strict';
import { resolvePianoCanonicalTab, PIANO_CANONICAL_TAB_MAP } from './canonicalTabs';

// 1. 별칭 정규화 테스트
assert.equal(resolvePianoCanonicalTab('lessons'), 'attendance');
assert.equal(resolvePianoCanonicalTab('check-in'), 'attendance');
assert.equal(resolvePianoCanonicalTab('roster'), 'students');
assert.equal(resolvePianoCanonicalTab('members'), 'students');
assert.equal(resolvePianoCanonicalTab('customers'), 'students');
assert.equal(resolvePianoCanonicalTab('seat-rooms'), 'practice-rooms');
assert.equal(resolvePianoCanonicalTab('spaces'), 'practice-rooms');
assert.equal(resolvePianoCanonicalTab('billing'), 'tuition');
assert.equal(resolvePianoCanonicalTab('billing-invoices'), 'tuition');
assert.equal(resolvePianoCanonicalTab('schedules'), 'timetable');
assert.equal(resolvePianoCanonicalTab('consultation'), 'consultations');

// 2. 이미 캐노니컬이거나 알 수 없는 탭은 null 반환
assert.equal(resolvePianoCanonicalTab('attendance'), null);
assert.equal(resolvePianoCanonicalTab('students'), null);
assert.equal(resolvePianoCanonicalTab('practice-rooms'), null);
assert.equal(resolvePianoCanonicalTab('tuition'), null);
assert.equal(resolvePianoCanonicalTab('timetable'), null);
assert.equal(resolvePianoCanonicalTab('unknown-tab'), null);

console.log('canonicalTabs.test.ts: all tests passed ok');
