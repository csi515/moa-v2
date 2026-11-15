import assert from 'node:assert/strict';
import { mapLoginErrorMessage, isEmailNotConfirmedError } from './utils/mapLoginErrorMessage';
import { getUserProvider } from './services/authService';
import { isOnline, guardOnlineAction } from '@/shared/utils/networkGuard';
import type { User } from '@supabase/supabase-js';

// 1. mapLoginErrorMessage 테스트
assert.equal(
  mapLoginErrorMessage('Failed to fetch'),
  '네트워크 연결이 불안정합니다. 인터넷 연결 상태를 확인하고 다시 시도해 주세요.'
);
assert.equal(
  mapLoginErrorMessage('NetworkError when attempting to fetch resource.'),
  '네트워크 연결이 불안정합니다. 인터넷 연결 상태를 확인하고 다시 시도해 주세요.'
);
assert.equal(
  mapLoginErrorMessage('Request timeout after 5000ms'),
  '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
);
assert.equal(
  mapLoginErrorMessage('access_denied'),
  '로그인이 취소되었습니다.'
);
assert.equal(
  mapLoginErrorMessage('Invalid login credentials'),
  '이메일 또는 비밀번호가 올바르지 않습니다. 계정이 없다면 회원가입을 진행해 주세요.'
);
assert.equal(
  isEmailNotConfirmedError('Email not confirmed'),
  true
);

// 2. getUserProvider 테스트
assert.equal(getUserProvider(null), 'email');
assert.equal(getUserProvider(undefined), 'email');
assert.equal(
  getUserProvider({ app_metadata: { provider: 'kakao' } } as unknown as User),
  'kakao'
);
assert.equal(
  getUserProvider({ app_metadata: { provider: 'google' } } as unknown as User),
  'google'
);
assert.equal(
  getUserProvider({ identities: [{ provider: 'apple' }] } as unknown as User),
  'apple'
);
assert.equal(
  getUserProvider({ app_metadata: { provider: 'email' } } as unknown as User),
  'email'
);

// 3. networkGuard 테스트 (Node 환경에서는 navigator.onLine이 없거나 boolean)
assert.equal(typeof isOnline(), 'boolean');
assert.equal(guardOnlineAction('테스트 작업'), isOnline());

console.log('resilienceAuth.test.ts: all pass');
