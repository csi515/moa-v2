/**
 * 수업일지 → 주간과제 — 동시 수정 병합, 부모 확인 보존, 단일 저장.
 * 실행: npm run test:lesson-homework-sync
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AssignmentItem } from '@/types/education';
import { modelSerializedHomeworkSync, planLessonHomeworkSync } from './lessonHomeworkPlan';

function item(partial: Partial<AssignmentItem> & Pick<AssignmentItem, 'id' | 'songTitle'>): AssignmentItem {
  return {
    assignmentId: 'wasg-1',
    instructions: '하루 3번',
    sortOrder: 0,
    parentConfirmed: false,
    completed: false,
    ...partial,
  };
}

function run() {
  const confirmed = item({
    id: 'ai-1',
    songTitle: '체르니 30',
    instructions: '하루 3번',
    parentConfirmed: true,
    completed: true,
    parentConfirmedAt: '2026-09-20T00:00:00.000Z',
  });

  const sameHomework = planLessonHomeworkSync({
    latestItems: [confirmed],
    songTitle: '체르니 30',
    homework: '하루 3번',
  });
  assert.equal(sameHomework.action, 'noop');
  assert.equal(sameHomework.items[0].parentConfirmed, true);
  assert.equal(sameHomework.items[0].completed, true);

  const changed = planLessonHomeworkSync({
    latestItems: [confirmed],
    songTitle: '체르니 30',
    homework: '하루 5번',
  });
  assert.equal(changed.action, 'update');
  if (changed.action === 'update') {
    assert.equal(changed.resetParentState, true);
    assert.equal(changed.items[0].parentConfirmed, false);
  }

  const merged = modelSerializedHomeworkSync({
    baseItems: [confirmed],
    first: { songTitle: '소나티네', homework: '1악장' },
    secondAfterLatest: { songTitle: '바이엘', homework: '30번' },
  });
  assert.equal(merged.length, 3);
  assert.ok(merged.some((it) => it.songTitle === '체르니 30' && it.parentConfirmed));
  assert.ok(merged.some((it) => it.songTitle === '소나티네'));
  assert.ok(merged.some((it) => it.songTitle === '바이엘'));

  const lastWriteSameSong = modelSerializedHomeworkSync({
    baseItems: [],
    first: { songTitle: '하농', homework: '느리게' },
    secondAfterLatest: { songTitle: '하농', homework: '빠르게' },
  });
  assert.equal(lastWriteSameSong.length, 1);
  assert.equal(lastWriteSameSong[0].instructions, '빠르게');

  const here = dirname(fileURLToPath(import.meta.url));
  const src = readFileSync(join(here, 'lessonHomeworkSync.ts'), 'utf8');
  assert.match(src, /planLessonHomeworkSync/);
  assert.equal((src.match(/saveWeeklyAssignment\(/g) || []).length, 1);

  console.log('lessonHomeworkSync.test.ts: ok');
}

run();
