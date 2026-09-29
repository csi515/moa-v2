/**
 * 사용자용 오류 메시지 분류.
 * 실행: npm run test:user-facing-error
 */
import assert from 'node:assert/strict';
import { classifyUserFacingError, userFacingErrorMessage } from './userFacingError';

function run() {
  assert.equal(classifyUserFacingError(new Error('failed to fetch')), 'network');
  assert.equal(
    classifyUserFacingError(
      new Error('Failed to fetch dynamically imported module: https://example.com/assets/x.js')
    ),
    'load_failed'
  );
  assert.equal(classifyUserFacingError(new Error('permission denied')), 'permission');
  assert.equal(classifyUserFacingError(new Error('duplicate key')), 'conflict');
  assert.equal(
    classifyUserFacingError(new Error('PostgREST internal detail...')),
    'temporary'
  );

  const postgrest = userFacingErrorMessage(
    new Error('PostgREST internal detail: relation "core.secret" does not exist')
  );
  assert.equal(postgrest.includes('PostgREST'), false);
  assert.equal(postgrest.includes('core.secret'), false);
  assert.equal(postgrest.includes('relation'), false);

  const fetchMsg = userFacingErrorMessage(new Error('failed to fetch'));
  assert.equal(fetchMsg.includes('failed to fetch'), false);

  const phoneRequired = userFacingErrorMessage(
    new Error('사업장 전화번호를 입력해 주세요.')
  );
  assert.equal(phoneRequired, '사업장 전화번호를 입력해 주세요.');
  const wrappedKorean = userFacingErrorMessage(
    new Error('ERROR: 사업장 주소를 입력해 주세요.')
  );
  assert.equal(wrappedKorean, '사업장 주소를 입력해 주세요.');

  console.log('userFacingError.test.ts: ok');
}

run();
