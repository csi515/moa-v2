import assert from 'node:assert/strict';
import { compressImageFile } from './imageCompressor';

async function run() {
  // 1. Node 환경 fallback 검증 (안전한 원본 반환)
  const fakeFile = new File(['fake-image-bytes'], 'test.jpg', { type: 'image/jpeg' });
  const result = await compressImageFile(fakeFile);
  assert.equal(result.name, 'test.jpg');
  assert.equal(result.size, fakeFile.size);

  console.log('imageCompressor.test.ts: ok');
}

run().catch((err) => {
  console.error('imageCompressor.test.ts failed:', err);
  process.exit(1);
});
