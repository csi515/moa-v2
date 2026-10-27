import type { User } from '@supabase/supabase-js';
import {
  syncAuthProvidersOnLogin,
  syncOAuthIdentitiesFromSession,
} from '../auth/services/authProviderService';
import { connectParentOnLogin } from '../parent/services/parentAccountService';
import { connectStaffOnLogin } from '../staff/services/staffAccountService';
import { getCoreClient } from '@/lib/supabase';

/** 로그인 시 계정 연결 RPC를 일관된 순서로 실행 (모든 하위 동기화는 non-blocking soft-fail 처리) */
export async function runLoginAccountSync(user?: User | null): Promise<void> {
  try {
    await connectStaffOnLogin();
  } catch (err) {
    console.warn('[loginBootstrap] connectStaffOnLogin soft-fail:', err);
  }

  try {
    await syncAuthProvidersOnLogin();
  } catch (err) {
    console.warn('[loginBootstrap] syncAuthProvidersOnLogin soft-fail:', err);
  }

  try {
    const sessionUser =
      user ?? (await getCoreClient().auth.getUser()).data.user ?? null;
    if (sessionUser) {
      await syncOAuthIdentitiesFromSession(sessionUser);
    }
  } catch (err) {
    console.warn(
      '[loginBootstrap] OAuth identity sync soft-fail',
      err instanceof Error ? err.message : err
    );
  }

  try {
    await connectParentOnLogin();
  } catch (err) {
    console.warn('[loginBootstrap] connectParentOnLogin soft-fail:', err);
  }
}
