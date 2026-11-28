import assert from 'node:assert/strict';
import {
  SEAL_MAX_BYTES,
  SEAL_MAX_HEIGHT,
  SEAL_MAX_WIDTH,
  assertSealByteLimit,
  validateSealDimensions,
} from './normalizeSealImage.ts';

assert.equal(SEAL_MAX_WIDTH, 200);
assert.equal(SEAL_MAX_HEIGHT, 200);
assert.equal(SEAL_MAX_BYTES, 200 * 1024);

{
  const ok = validateSealDimensions(100, 80);
  assert.equal(ok.withinLimit, true);
  assert.equal(ok.width, 100);
  assert.equal(ok.height, 80);
}

{
  const fitted = validateSealDimensions(400, 300);
  assert.equal(fitted.withinLimit, false);
  assert.ok(fitted.width <= 200);
  assert.ok(fitted.height <= 200);
}

assert.doesNotThrow(() => assertSealByteLimit(100 * 1024));
assert.throws(() => assertSealByteLimit(300 * 1024), /200KB/);

console.log('normalizeSealImage.test.ts: ok');
