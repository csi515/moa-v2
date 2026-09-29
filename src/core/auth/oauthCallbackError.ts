const STASH_KEY = 'moa.oauthCallbackError';

const OAUTH_CALLBACK_COPY = {
  invalidScope: '소셜 로그인을 완료하지 못했습니다. 이메일로 로그인해 주세요.',
  generic: '소셜 로그인을 완료하지 못했습니다. 이메일로 로그인해 주세요.',
} as const;

export function oauthErrorMessageFromCode(code: string | null): string | null {
  if (!code) return null;
  if (code === 'invalid_scope') return OAUTH_CALLBACK_COPY.invalidScope;
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
  return oauthErrorMessageFromCode(paramsFromLocation().get('error'));
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
