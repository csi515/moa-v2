import type { User } from '@supabase/supabase-js';
import { getCoreClient } from '@/lib/supabase';
import type { Json } from '@/lib/supabase/database.types';

export type AuthProviderType = 'email' | 'phone' | 'kakao' | 'naver' | 'google' | 'apple';

export interface AuthProviderRecord {
  id: string;
  provider: AuthProviderType;
  providerUserId: string;
  email: string | null;
  phone: string | null;
  verifiedAt: string | null;
}

export interface SyncAuthProvidersResult {
  synced: number;
}

/** Supabase identity.provider → core.auth_provider_type (email/phone은 별도 sync) */
const OAUTH_PROVIDER_MAP: Record<string, AuthProviderType> = {
  kakao: 'kakao',
  naver: 'naver',
  'custom:naver': 'naver',
  google: 'google',
  apple: 'apple',
};

function mapIdentityProvider(raw: string | undefined): AuthProviderType | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key === 'email' || key === 'phone') return null;
  return OAUTH_PROVIDER_MAP[key] ?? null;
}

/** 로그인 시 email identity를 auth_providers에 동기화 */
export async function syncAuthProvidersOnLogin(): Promise<SyncAuthProvidersResult> {
  const { data, error } = await getCoreClient().rpc('sync_auth_providers_on_login');
  if (error) throw error;

  const result = (data ?? {}) as { synced?: number };
  return { synced: result.synced ?? 0 };
}

/**
 * OAuth provider 등록 RPC — 카카오/네이버 로그인 후 identity sync에 사용
 */
export async function registerAuthProvider(params: {
  provider: AuthProviderType;
  providerUserId: string;
  email?: string | null;
  phone?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<AuthProviderRecord> {
  const { data, error } = await getCoreClient().rpc('register_auth_provider', {
    p_provider: params.provider,
    p_provider_user_id: params.providerUserId,
    p_email: params.email ?? null,
    p_phone: params.phone ?? null,
    p_metadata: (params.metadata ?? {}) as Json,
  });
  if (error) throw error;

  const row = (data ?? {}) as {
    id: string;
    provider: AuthProviderType;
    provider_user_id: string;
  };

  return {
    id: String(row.id),
    provider: row.provider,
    providerUserId: String(row.provider_user_id),
    email: params.email ?? null,
    phone: params.phone ?? null,
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * session.user.identities → core.auth_providers (가드된 register_auth_provider)
 * email identity는 sync_auth_providers_on_login이 담당하므로 스킵
 */
export async function syncOAuthIdentitiesFromSession(user: User): Promise<{ synced: number }> {
  const identities = user.identities ?? [];
  let synced = 0;

  for (const identity of identities) {
    const provider = mapIdentityProvider(identity.provider);
    if (!provider) continue;

    const providerUserId = String(identity.id ?? '').trim();
    if (!providerUserId) continue;

    const data = (identity.identity_data ?? {}) as Record<string, unknown>;
    const email =
      typeof data.email === 'string'
        ? data.email
        : typeof user.email === 'string'
          ? user.email
          : null;
    const phone = typeof data.phone === 'string' ? data.phone : null;

    await registerAuthProvider({
      provider,
      providerUserId,
      email,
      phone,
      metadata: {
        supabase_identity_id: identity.identity_id ?? null,
        raw_provider: identity.provider,
      },
    });
    synced += 1;
  }

  return { synced };
}
