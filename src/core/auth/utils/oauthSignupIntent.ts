import { peekPendingGuardianLink } from '@/core/parent/services/guardianLinkService';
import { peekPendingOrgPublicCode } from '@/core/parent/services/pendingOrgConnect';
import {
  getSessionItem,
  removeSessionItem,
  setSessionItem,
} from '@/core/parent/services/sessionStorageSafe';

const OAUTH_INTENT_KEY = 'moa_oauth_signup_intent';

export type OAuthSignupIntent = {
  mode: 'login' | 'signup';
  fullName?: string;
  /** OAuth 리다이렉트 중 유실 방지용 가디언 연결 코드 */
  pendingGuardianLink?: string;
  /** 공개 사업장 코드 → 학원 연결 요청 */
  pendingOrgPublicCode?: string;
};

/** OAuth 리다이렉트 전 가입 의도 저장 (pending 학원 연결 토큰·코드 병행 보존) */
export function saveOAuthSignupIntent(intent: OAuthSignupIntent): void {
  const withPending: OAuthSignupIntent = {
    ...intent,
    pendingGuardianLink:
      intent.pendingGuardianLink ?? peekPendingGuardianLink() ?? undefined,
    pendingOrgPublicCode:
      intent.pendingOrgPublicCode ?? peekPendingOrgPublicCode() ?? undefined,
  };
  setSessionItem(OAUTH_INTENT_KEY, JSON.stringify(withPending));
}

export function peekOAuthSignupIntent(): OAuthSignupIntent | null {
  const raw = getSessionItem(OAUTH_INTENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OAuthSignupIntent;
  } catch {
    return null;
  }
}

export function clearOAuthSignupIntent(): void {
  removeSessionItem(OAUTH_INTENT_KEY);
}

export function consumeOAuthSignupIntent(): OAuthSignupIntent | null {
  const intent = peekOAuthSignupIntent();
  clearOAuthSignupIntent();
  return intent;
}
