/**
 * 플랫폼 런타임 감지 모듈 (Platform Detector)
 * 
 * Apps in Toss(토스 웹뷰) 환경과 일반 브라우저(Cloudflare 웹 배포) 환경을
 * 단일 코드베이스에서 순수 함수 기반으로 판별합니다.
 */

declare global {
  interface Window {
    Toss?: unknown;
    __TOSS__?: unknown;
    toss?: unknown;
    tossBridge?: unknown;
    appsInToss?: unknown;
  }
}

/**
 * 런타임 환경에서 토스 브릿지 객체 존재 여부 확인 (브라우저 안전)
 */
export function checkHasTossBridge(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const w = window as Window;
  return Boolean(
    w.Toss ||
    w.__TOSS__ ||
    w.toss ||
    w.tossBridge ||
    w.appsInToss
  );
}

/**
 * Apps in Toss(토스 앱 내 인앱 웹뷰) 환경 여부 판별
 * 
 * @param userAgent User-Agent 문자열 (미전달 시 런타임 navigator.userAgent 사용)
 * @param hasBridge 전역 토스 브릿지 객체 존재 여부 (미전달 시 런타임 window 객체 탐색)
 * @returns 토스 앱 환경 여부 (boolean)
 */
export function isAppsInToss(userAgent?: string, hasBridge?: boolean): boolean {
  // 1. 브릿지 객체 여부가 명시된 경우 우선 반영
  if (hasBridge === true) {
    return true;
  }

  // 2. 브릿지 명시가 없는 브라우저 런타임인 경우 window 객체 검사
  if (hasBridge === undefined && checkHasTossBridge()) {
    return true;
  }

  // 3. User-Agent 판별
  const ua =
    userAgent !== undefined
      ? userAgent
      : typeof navigator !== 'undefined'
        ? navigator.userAgent
        : '';

  if (!ua) {
    return false;
  }

  // User-Agent 내 'toss' 포함 여부 판정 (대소문자 무시, e.g. TossApp, Toss/5.x)
  return /toss/i.test(ua);
}

/**
 * 현재 실행 플랫폼 반환
 */
export function detectPlatform(opts?: {
  userAgent?: string;
  hasBridge?: boolean;
}): 'toss' | 'web' {
  return isAppsInToss(opts?.userAgent, opts?.hasBridge) ? 'toss' : 'web';
}
