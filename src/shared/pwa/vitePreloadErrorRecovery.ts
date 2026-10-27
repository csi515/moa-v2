/**
 * Vite Preload Error Recovery Boundary
 * 
 * SPA/PWA 배포 직후 구버전 캐시로 인한 청크 로드 실패(ChunkLoadError, vite:preloadError) 대응:
 * 1. window.addEventListener('vite:preloadError') 글로벌 이벤트 가로채기
 * 2. sessionStorage 플래그 기반으로 무한 리로드 루프 차단
 * 3. 서비스 워커 업데이트 및 원자적 새로고침 트리거
 */

import { createLogger } from '@/core/logging';

const logger = createLogger('VitePreloadRecovery');

export const VITE_PRELOAD_FLAG = 'moa.vitePreloadRecovery';
const RELOAD_COOLDOWN_MS = 15_000;

export interface PreloadRecoveryOptions {
  storage?: Storage;
  location?: Pick<Location, 'reload'>;
  updateServiceWorkers?: () => Promise<void>;
}

export function handlePreloadError(
  error: unknown,
  options?: PreloadRecoveryOptions
): boolean {
  const storage = options?.storage ?? (typeof window !== 'undefined' ? window.sessionStorage : undefined);
  const location = options?.location ?? (typeof window !== 'undefined' ? window.location : undefined);

  if (!storage || !location) {
    return false;
  }

  try {
    const lastAttempt = storage.getItem(VITE_PRELOAD_FLAG);
    const now = Date.now();

    if (lastAttempt) {
      const elapsed = now - Number(lastAttempt);
      if (elapsed < RELOAD_COOLDOWN_MS) {
        // 무한 리로드 방지
        logger.error('Stale chunk detected but reload cooldown active:', error);
        return false;
      }
    }

    storage.setItem(VITE_PRELOAD_FLAG, String(now));
  } catch {
    /* private mode */
  }

  void (async () => {
    try {
      if (options?.updateServiceWorkers) {
        await options.updateServiceWorkers();
      } else if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.update()));
      }
    } catch {
      /* ignore */
    }
    location.reload();
  })();

  return true;
}

/**
 * 브라우저 환경에서 vite:preloadError 및 동적 청크 로딩 실패 리스너 등록
 */
export function setupVitePreloadErrorRecovery(): () => void {
  if (typeof window === 'undefined') return () => {};

  const listener = (event: Event) => {
    // 기본 에러 동작 방지 후 복구 바운더리 실행
    event.preventDefault();
    const payload = (event as any).payload ?? (event as CustomEvent).detail;
    handlePreloadError(payload);
  };

  const rejectionListener = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const msg = (reason instanceof Error ? reason.message : String(reason || '')).toLowerCase();
    if (
      msg.includes('failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('loading chunk')
    ) {
      event.preventDefault();
      handlePreloadError(reason);
    }
  };

  window.addEventListener('vite:preloadError', listener);
  window.addEventListener('unhandledrejection', rejectionListener);

  return () => {
    window.removeEventListener('vite:preloadError', listener);
    window.removeEventListener('unhandledrejection', rejectionListener);
  };
}
