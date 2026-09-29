/**
 * 실행: npx tsx src/core/auth/oauthCallbackError.test.ts
 */
import assert from 'node:assert/strict';
import { oauthErrorMessageFromCode, readOAuthCallbackError } from './oauthCallbackError';

assert.equal(readOAuthCallbackError(), null);
assert.equal(oauthErrorMessageFromCode(null), null);
assert.equal(
  oauthErrorMessageFromCode('invalid_scope'),
  '소셜 로그인을 완료하지 못했습니다. 이메일로 로그인해 주세요.'
);
assert.equal(
  oauthErrorMessageFromCode('access_denied'),
  '소셜 로그인을 완료하지 못했습니다. 이메일로 로그인해 주세요.'
);
console.log('oauthCallbackError.test.ts: ok');
