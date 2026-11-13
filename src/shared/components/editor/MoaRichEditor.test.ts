import assert from 'node:assert/strict';
import { MoaRichEditor } from './MoaRichEditor';

function run() {
  assert.equal(typeof MoaRichEditor, 'function');
  console.log('MoaRichEditor.test.ts: ok');
}

run();
