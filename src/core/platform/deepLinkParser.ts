/** URL·딥링크 문자열에서 staff_link / link(학부모) 쿼리 추출 */

export interface ParsedDeepLinks {
  staffLink: string | null;
  guardianLink: string | null;
}

/** 기존 8자리 코드(16진수 대문자) — 만료 전까지 계속 허용 */
const LEGACY_GUARDIAN_CODE_RE = /^[0-9A-Z]{8}$/;
/** 새 20자리 Crockford base32 (I L O U 제외) */
const GUARDIAN_CODE_V2_RE = /^[0-9A-HJKMNP-TV-Z]{20}$/;
/** 교직원 초대 코드: 영숫자 8~64자 */
const STAFF_CODE_RE = /^[0-9A-Z]{8,64}$/;

/**
 * 보호자 연결 코드 정규화: 대문자, 영숫자 외 제거(하이픈·공백 허용),
 * Crockford 혼동 문자 보정(O→0, I/L→1). 서버 core.normalize_guardian_link_code 와 동일.
 */
export function normalizeGuardianLinkCode(raw: string | null | undefined): string {
  return (raw ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
}

export function isValidGuardianLinkCode(code: string | null | undefined): boolean {
  const c = code ?? '';
  return LEGACY_GUARDIAN_CODE_RE.test(c) || GUARDIAN_CODE_V2_RE.test(c);
}

/** 유효하면 정규화된 코드, 아니면 null */
export function parseGuardianLinkCode(raw: string | null | undefined): string | null {
  const code = normalizeGuardianLinkCode(raw);
  return isValidGuardianLinkCode(code) ? code : null;
}

/** 표시용: 4자리씩 하이픈 (20자 코드). 8자리 기존 코드는 그대로 */
export function formatGuardianLinkCode(code: string): string {
  const c = normalizeGuardianLinkCode(code);
  return c.length > 8 ? c.replace(/(.{4})(?=.)/g, '$1-') : c;
}

export function parseStaffLinkCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return STAFF_CODE_RE.test(code) ? code : null;
}

export function parseDeepLinksFromUrl(url: string): ParsedDeepLinks {
  try {
    const parsed = new URL(url);
    const staffLink = parseStaffLinkCode(parsed.searchParams.get('staff_link'));
    const guardianLink = parseGuardianLinkCode(parsed.searchParams.get('link'));
    return { staffLink, guardianLink };
  } catch {
    return { staffLink: null, guardianLink: null };
  }
}

export function parseDeepLinksFromHref(): ParsedDeepLinks {
  if (typeof window === 'undefined') {
    return { staffLink: null, guardianLink: null };
  }
  return parseDeepLinksFromUrl(window.location.href);
}
