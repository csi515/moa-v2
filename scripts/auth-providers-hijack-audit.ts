/**
 * auth_providers identity 탈취 감사
 *
 * 시나리오: User B 세션으로 User A 소유 (provider, provider_user_id)를
 * register_auth_provider 호출 → 실패해야 PASS.
 *
 * 환경변수:
 *   SUPABASE_URL 또는 VITE_SUPABASE_URL
 *   SUPABASE_ANON_KEY 또는 VITE_SUPABASE_ANON_KEY
 *   AUTH_HIJACK_USER_B_JWT  — 공격자(User B) access token
 *   AUTH_HIJACK_PROVIDER     — 기본 kakao
 *   AUTH_HIJACK_PROVIDER_USER_ID — User A에 이미 링크된 provider_user_id
 *
 * 시드가 없으면 dry-run으로 시나리오만 출력하고 exit 0.
 * 실행: npx tsx scripts/auth-providers-hijack-audit.ts
 */
import { createClient } from '@supabase/supabase-js';

function env(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

async function main(): Promise<void> {
  const url = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  const userBJwt = env('AUTH_HIJACK_USER_B_JWT');
  const provider = env('AUTH_HIJACK_PROVIDER') || 'kakao';
  const providerUserId = env('AUTH_HIJACK_PROVIDER_USER_ID');

  if (!url || !anonKey || !userBJwt || !providerUserId) {
    console.log('[auth-hijack-audit] dry-run — 시드/JWT 환경변수 미설정. 시나리오만 안내합니다.');
    console.log('  H1 User B → register_auth_provider(User A identity) = EXCEPTION (탈취 차단)');
    console.log('  H2 User B → sync_auth_providers_for_user(User A id) = EXCEPTION');
    console.log('필요 env: SUPABASE_URL, SUPABASE_ANON_KEY, AUTH_HIJACK_USER_B_JWT,');
    console.log('         AUTH_HIJACK_PROVIDER_USER_ID [, AUTH_HIJACK_PROVIDER]');
    console.log('선택: AUTH_HIJACK_USER_A_ID (H2용 — User A UUID)');
    process.exit(0);
  }

  const client = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${userBJwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let failed = 0;

  // H1: 타 사용자 identity 탈취 시도 → 에러여야 PASS
  {
    const { data, error } = await client.schema('core').rpc('register_auth_provider', {
      p_provider: provider,
      p_provider_user_id: providerUserId,
      p_email: null,
      p_phone: null,
      p_metadata: {},
    });
    const blocked =
      !!error &&
      /already linked|another user|Authentication required/i.test(error.message);
    const mark = blocked ? 'PASS' : 'FAIL';
    console.log(
      `[${mark}] H1 User B cannot hijack User A identity (${error?.message ?? `data=${JSON.stringify(data)}`})`
    );
    if (!blocked) failed++;
  }

  // H2: 타 사용자 sync 호출 → 에러여야 PASS
  const userAId = env('AUTH_HIJACK_USER_A_ID');
  if (userAId) {
    const { data, error } = await client.schema('core').rpc('sync_auth_providers_for_user', {
      p_user_id: userAId,
    });
    const blocked =
      !!error && /only sync own user|Authentication required/i.test(error.message);
    const mark = blocked ? 'PASS' : 'FAIL';
    console.log(
      `[${mark}] H2 User B cannot sync User A providers (${error?.message ?? `synced=${JSON.stringify(data)}`})`
    );
    if (!blocked) failed++;
  } else {
    console.log('[SKIP] H2 AUTH_HIJACK_USER_A_ID 미설정');
  }

  if (failed > 0) {
    console.error(`[auth-hijack-audit] ${failed} scenario(s) failed`);
    process.exit(1);
  }
  console.log('[auth-hijack-audit] all scenarios passed');
}

main().catch((err) => {
  console.error('[auth-hijack-audit] fatal', err);
  process.exit(1);
});
