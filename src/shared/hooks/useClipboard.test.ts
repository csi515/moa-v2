import assert from 'node:assert';
import { useClipboard } from './useClipboard';

console.log('Testing useClipboard logic...');

// Test 1: 기본 형태와 export 검증
assert.strictEqual(typeof useClipboard, 'function', 'useClipboard should be a function');

console.log('useClipboard.test.ts: ok');
