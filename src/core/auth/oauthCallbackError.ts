const STASH_KEY = 'moa.oauthCallbackError';

const OAUTH_CALLBACK_COPY = {
  accessDenied: '소셜 로그인이 취소되었습니다. 다시 시도해 주세요.',
  popupClosed: '소셜 로그인 창이 닫혔습니다. 다시 시도해 주세요.',
  invalidScope: '소셜 로그인 권한 설정에 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  serverError: '소셜 로그인 서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  temporarilyUnavailable: '소셜 서비스가 일시적으로 원활하지 않습니다. 잠시 후 다시 시도해 주세요.',
  unauthorizedClient: '인증되지 않은 소셜 로그인 요청입니다.',
  generic: '소셜 로그인을 완료하지 못했습니다. 다시 시도하거나 이메일로 로그인해 주세요.',
} as const;

export function oauthErrorMessageFromCode(
  code: string | null,
  description?: string | null
): string | null {
  if (!code && !description) return null;

  const normalizedCode = (code ?? '').toLowerCase();
  const normalizedDesc = (description ?? '').toLowerCase();

  // 사용자 명시적 취소/거부 케이스
  if (
    normalizedCode === 'access_denied' ||
    normalizedCode === 'user_cancelled' ||
    normalizedDesc.includes('access_denied') ||
    normalizedDesc.includes('consent_required') ||
    normalizedDesc.includes('cancel')
  ) {
    return OAUTH_CALLBACK_COPY.accessDenied;
  }

  // 창 닫힘 케이스
  if (normalizedCode === 'popup_closed_by_user' || normalizedDesc.includes('popup')) {
    return OAUTH_CALLBACK_COPY.popupClosed;
  }

  // 스코프/권한 케이스
  if (normalizedCode === 'invalid_scope' || normalizedDesc.includes('scope')) {
    return OAUTH_CALLBACK_COPY.invalidScope;
  }

  // 서버 일시 중단 케이스
  if (
    normalizedCode === 'temporarily_unavailable' ||
    normalizedDesc.includes('unavailable')
  ) {
    return OAUTH_CALLBACK_COPY.temporarilyUnavailable;
  }

  // 서버 장애 케이스
  if (
    normalizedCode === 'server_error' ||
    normalizedDesc.includes('server_error')
  ) {
    return OAUTH_CALLBACK_COPY.serverError;
  }

  // 클라이언트 권한 케이스
  if (normalizedCode === 'unauthorized_client') {
    return OAUTH_CALLBACK_COPY.unauthorizedClient;
  }

  return OAUTH_CALLBACK_COPY.generic;
}

function paramsFromLocation(): URLSearchParams {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  for (const [key, value] of hash.entries()) {
    if (!search.has(key)) search.set(key, value);
  }
  return search;
}

/** OAuth 리다이렉트 오류 문구. 없으면 null */
export function readOAuthCallbackError(): string | null {
  if (typeof window === 'undefined') return null;
  const params = paramsFromLocation();
  return oauthErrorMessageFromCode(params.get('error'), params.get('error_description'));
}

export function clearOAuthCallbackParams(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('sb');
  url.hash = '';
  const next = `${url.pathname}${url.search}`;
  window.history.replaceState({}, '', next);
}

/** 로그인 화면이 열리기 전에 URL에서 오류를 치우고 sessionStorage에 남긴다 */
export function stashOAuthCallbackErrorFromLocation(): void {
  const message = readOAuthCallbackError();
  if (!message) return;
  try {
    sessionStorage.setItem(STASH_KEY, message);
  } catch {
    /* private mode */
  }
  clearOAuthCallbackParams();
}

export function consumeOAuthCallbackError(): string | null {
  const fromUrl = readOAuthCallbackError();
  if (fromUrl) {
    clearOAuthCallbackParams();
    try {
      sessionStorage.removeItem(STASH_KEY);
    } catch {
      /* ignore */
    }
    return fromUrl;
  }
  try {
    const stashed = sessionStorage.getItem(STASH_KEY);
    if (stashed) {
      sessionStorage.removeItem(STASH_KEY);
      return stashed;
    }
  } catch {
    /* ignore */
  }
  return null;
}
