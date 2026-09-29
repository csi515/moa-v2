/**
 * 실행: npx tsx src/shared/pwa/reloadOnStaleChunk.test.ts
 */
import assert from 'node:assert/strict';
import { isStaleChunkError } from './reloadOnStaleChunk';

assert.equal(
  isStaleChunkError(
    new TypeError('Failed to fetch dynamically imported module: https://moa-saas.vercel.app/assets/x.js')
  ),
  true
);
assert.equal(isStaleChunkError(new Error('failed to fetch')), false);
assert.equal(isStaleChunkError(new Error('permission denied')), false);
console.log('reloadOnStaleChunk.test.ts: ok');
