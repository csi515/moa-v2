import { getCoreClient } from '@/lib/supabase';
import {
  clearOAuthSignupIntent,
  peekOAuthSignupIntent,
  type OAuthSignupIntent,
} from '../utils/oauthSignupIntent';
import { storePendingGuardianLink } from '@/core/parent/services/guardianLinkService';
import { storePendingOrgPublicCode } from '@/core/parent/services/pendingOrgConnect';
import { setParentPortalModeActive } from '@/core/parent/services/appModeService';

/**
 * OAuth 복귀 후 sessionStorage 가입 의도를 프로필에 반영
 * updateUser 실패 시 intent를 유지해 재시도 가능 (consume은 성공 후)
 */
export async function applyOAuthSignupIntentIfAny(): Promise<OAuthSignupIntent | null> {
  const intent = peekOAuthSignupIntent();
  if (!intent) return null;

  if (intent.pendingGuardianLink) {
    storePendingGuardianLink(intent.pendingGuardianLink);
    setParentPortalModeActive(true);
  }
  if (intent.pendingOrgPublicCode) {
    storePendingOrgPublicCode(intent.pendingOrgPublicCode);
    setParentPortalModeActive(true);
  }

  if (intent.mode !== 'signup') {
    clearOAuthSignupIntent();
    return intent;
  }

  const fullName = intent.fullName?.trim() || undefined;
  if (fullName) {
    const { error } = await getCoreClient().auth.updateUser({
      data: { full_name: fullName },
    });
    if (error) {
      console.warn('[oauth] failed to apply signup intent', error.message);
      // 이름 반영 실패 — intent 유지 (다음 로그인 부트스트랩에서 재시도)
      return intent;
    }
  }

  clearOAuthSignupIntent();
  return intent;
}
