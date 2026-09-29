/** 사용자 화면용 오류 분류. 내부 detail은 로그에만 남긴다. */

export const USER_FACING_ERROR_KINDS = [
  'network',
  'permission',
  'load_failed',
  'conflict',
  'temporary',
] as const;

export type UserFacingErrorKind = (typeof USER_FACING_ERROR_KINDS)[number];

export const USER_FACING_ERROR_MESSAGES: Record<UserFacingErrorKind, string> = {
  network: '네트워크 오류입니다. 연결을 확인한 뒤 다시 시도해 주세요.',
  permission: '권한이 없습니다. 다시 로그인하거나 관리자에게 문의해 주세요.',
  load_failed: '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  conflict: '이미 처리된 요청이거나 중복된 데이터입니다. 화면을 새로고침해 주세요.',
  temporary: '일시적인 오류입니다. 잠시 후 다시 시도해 주세요.',
};

function rawErrorText(error: unknown): string {
  if (error instanceof Error) return error.message ?? '';
  if (typeof error === 'string') return error;
  return '';
}

export function classifyUserFacingError(error: unknown): UserFacingErrorKind {
  const text = rawErrorText(error).toLowerCase();

  if (
    /failed to fetch dynamically imported module|importing a module script failed|loading chunk \d+ failed|chunkloaderror/.test(
      text
    )
  ) {
    return 'load_failed';
  }
  if (
    /failed to fetch|network|offline|timeout|econnreset|load failed|net::|dns/.test(text)
  ) {
    return 'network';
  }
  if (
    /permission denied|forbidden|unauthorized|not authorized|rls|42501|jwt|row-level/.test(
      text
    )
  ) {
    return 'permission';
  }
  if (/duplicate key|unique constraint|23505|already exists|conflict/.test(text)) {
    return 'conflict';
  }
  if (/hydrate|불러오지|not found|pgrst116|42p01/.test(text)) {
    return 'load_failed';
  }
  return 'temporary';
}

function localizedDomainMessage(raw: string): string | null {
  const compact = raw.replace(/^[\s\S]*?:\s*/, '').split(/\r|\n/)[0]?.trim() ?? '';
  const candidate = compact || raw.trim();
  if (candidate.length === 0 || candidate.length > 160) return null;
  if (/relation |column |syntax error|postgrest|permission denied|jwt/i.test(candidate)) {
    return null;
  }
  if (/[가-힣]/.test(candidate) && /주세요|없습니다|초과|올바르지|실패했습니다/.test(candidate)) {
    return candidate;
  }
  return null;
}

export function userFacingErrorMessage(error: unknown): string {
  const localized = localizedDomainMessage(rawErrorText(error));
  if (localized) return localized;
  return USER_FACING_ERROR_MESSAGES[classifyUserFacingError(error)];
}
