import assert from 'node:assert/strict';
import { WorkflowVisualizer } from './WorkflowVisualizer';

function run() {
  assert.equal(typeof WorkflowVisualizer, 'function');
  console.log('WorkflowVisualizer.test.ts: ok');
}

run();
