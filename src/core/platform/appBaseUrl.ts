import { isNativeApp } from './capacitorPlatform';

/**
 * 공유·QR·초대 링크에 쓰는 공개 앱 URL 결정 (순수 함수, 테스트용).
 * - 네이티브(Capacitor): WebView origin 이 https://localhost / capacitor://localhost 라
 *   외부에서 열 수 없으므로 반드시 VITE_APP_URL 사용.
 * - 웹/PWA: 현재 origin 우선(배포 호스트와 일치), 없으면 VITE_APP_URL.
 */
export function resolveAppBaseUrl(params: {
  native: boolean;
  origin?: string | null;
  envUrl?: string | null;
}): string {
  const env = (params.envUrl ?? '').trim().replace(/\/+$/, '');
  if (params.native) return env;
  const origin = (params.origin ?? '').trim().replace(/\/+$/, '');
  if (origin && /^https?:\/\//i.test(origin)) return origin;
  return env;
}

function readEnvAppUrl(): string {
  try {
    return ((import.meta.env?.VITE_APP_URL as string | undefined) ?? '').trim();
  } catch {
    return '';
  }
}

/** 앱 공개 URL (QR·초대 링크). 네이티브에서는 VITE_APP_URL 을 사용 */
export function getPublicAppBaseUrl(): string {
  return resolveAppBaseUrl({
    native: isNativeApp(),
    origin: typeof window !== 'undefined' ? window.location?.origin : null,
    envUrl: readEnvAppUrl(),
  });
}
