import type { User } from '@supabase/supabase-js';
import {
  syncAuthProvidersOnLogin,
  syncOAuthIdentitiesFromSession,
} from '../auth/services/authProviderService';
import { connectParentOnLogin } from '../parent/services/parentAccountService';
import { connectStaffOnLogin } from '../staff/services/staffAccountService';
import { getCoreClient } from '@/lib/supabase';

/** 로그인 시 계정 연결 RPC를 일관된 순서로 실행 */
export async function runLoginAccountSync(user?: User | null): Promise<void> {
  await connectStaffOnLogin();
  await syncAuthProvidersOnLogin();

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

  await connectParentOnLogin();
}
