export type WebInstallPlatform = 'ios-safari' | 'android-chrome' | 'other';

/** 브라우저 UA 기준 홈 화면 추가 가이드 플랫폼 */
export function detectWebInstallPlatform(): WebInstallPlatform {
  if (typeof navigator === 'undefined') return 'other';

  const ua = navigator.userAgent;
  const isIos =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIos) return 'ios-safari';

  if (/Android/i.test(ua)) return 'android-chrome';

  return 'other';
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return true;
  const media = window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return media || iosStandalone;
}
