/**
 * 실행: npx tsx src/industries/piano/components/lessons/todayLessonSaveTeacherId.test.ts
 */
import assert from 'node:assert/strict';
import { resolveTodayLessonSaveTeacherId } from './todayLessonSaveTeacherId';

assert.equal(
  resolveTodayLessonSaveTeacherId({ staffId: 'staff-1', classTeacherId: 't-class' }),
  'staff-1',
  '로그인 staffId 우선'
);

assert.equal(
  resolveTodayLessonSaveTeacherId({ staffId: '', classTeacherId: 't-class' }),
  't-class',
  '반 담당 강사 사용'
);

assert.equal(
  resolveTodayLessonSaveTeacherId({ staffId: undefined, classTeacherId: 't-class' }),
  't-class'
);

assert.equal(
  resolveTodayLessonSaveTeacherId({ staffId: null, classTeacherId: '' }),
  '',
  '담당 없으면 빈 teacherId — 첫 강사 자동 선택 금지'
);

assert.equal(
  resolveTodayLessonSaveTeacherId({ staffId: undefined, classTeacherId: undefined }),
  ''
);

console.log('todayLessonSaveTeacherId.test.ts: all assertions passed');
