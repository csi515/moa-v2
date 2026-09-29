/**
 * 실행: npx tsx src/shared/feedback/feedbackPolicy.test.ts
 */
import assert from 'node:assert/strict';
import { MAX_VISIBLE_TOASTS, nextWorkStatusId } from './feedbackPolicy';

function run(): void {
  assert.equal(MAX_VISIBLE_TOASTS, 2);
  const a = nextWorkStatusId();
  const b = nextWorkStatusId();
  assert.notEqual(a, b);
  console.log('feedbackPolicy.test.ts: ok');
}

run();
