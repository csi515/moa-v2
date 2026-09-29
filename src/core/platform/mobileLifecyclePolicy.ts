/**
 * 모바일 session refresh 정책 (순수 — supabase 클라이언트 비의존)
 */

/** 세션 만료 임박(기본 5분) 여부 */
export function shouldRefreshSession(
  expiresAtSec: number | undefined | null,
  nowSec = Math.floor(Date.now() / 1000),
  skewSec = 300
): boolean {
  if (expiresAtSec == null || !Number.isFinite(expiresAtSec)) return true;
  return expiresAtSec - nowSec <= skewSec;
}
