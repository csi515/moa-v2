/**
 * 실행: npx tsx src/core/auth/oauthCallbackError.test.ts
 */
import assert from 'node:assert/strict';
import { oauthErrorMessageFromCode, readOAuthCallbackError } from './oauthCallbackError';

assert.equal(readOAuthCallbackError(), null);
assert.equal(oauthErrorMessageFromCode(null), null);

// 취소 / 거부 케이스
assert.equal(
  oauthErrorMessageFromCode('access_denied'),
  '소셜 로그인이 취소되었습니다. 다시 시도해 주세요.'
);
assert.equal(
  oauthErrorMessageFromCode(null, 'User cancelled the login flow'),
  '소셜 로그인이 취소되었습니다. 다시 시도해 주세요.'
);

// 창 닫힘 케이스
assert.equal(
  oauthErrorMessageFromCode('popup_closed_by_user'),
  '소셜 로그인 창이 닫혔습니다. 다시 시도해 주세요.'
);

// 권한/스코프 케이스
assert.equal(
  oauthErrorMessageFromCode('invalid_scope'),
  '소셜 로그인 권한 설정에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
);

// 서버 장애 케이스
assert.equal(
  oauthErrorMessageFromCode('server_error'),
  '소셜 로그인 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.'
);
assert.equal(
  oauthErrorMessageFromCode('temporarily_unavailable'),
  '소셜 서비스가 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.'
);

// 미지정 generic 오류
assert.equal(
  oauthErrorMessageFromCode('unknown_error_code'),
  '소셜 로그인을 완료하지 못했습니다. 다시 시도하거나 이메일로 로그인해 주세요.'
);

console.log('oauthCallbackError.test.ts: ok');
