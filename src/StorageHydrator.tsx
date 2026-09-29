import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { StorageService } from './services/storage';
import { LoadingScreen } from './shared/components/LoadingScreen';
import { isNativeApp } from './core/platform/capacitorPlatform';
import { registerForegroundStep } from './core/platform/foregroundCoordinator';
import { userFacingErrorMessage } from './shared/errors/userFacingError';

interface StorageHydratorProps {
  organizationId: string;
  industryType?: string | null;
  children: React.ReactNode;
}

/** org 선택 시 StorageService hydrate */
export const StorageHydrator: React.FC<StorageHydratorProps> = ({
  organizationId,
  industryType,
  children,
}) => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const offlineModeRef = useRef(offlineMode);
  offlineModeRef.current = offlineMode;

  const runHydrate = useCallback(async (cancelled: () => boolean) => {
    setReady(false);
    setError(null);
    setOfflineMode(false);

    try {
      await StorageService.hydrate(organizationId, industryType);
      if (!cancelled()) {
        setOfflineMode(StorageService.isOfflineHydrated());
        setReady(true);
      }
    } catch (err) {
      console.error('[storage] hydrate failed', err);
      if (!cancelled()) {
        setError(userFacingErrorMessage(err));
      }
    }
  }, [organizationId, industryType]);

  /** offline snapshot 기동 후 네트워크 복구 — pending flush 후 조용히 재 hydrate */
  const runQuietRehydrate = useCallback(async () => {
    if (!offlineModeRef.current) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    try {
      await StorageService.flushSyncOutbox();
      await StorageService.hydrate(organizationId, industryType);
      setOfflineMode(StorageService.isOfflineHydrated());
      setError(null);
      setReady(true);
    } catch {
      /* 실패 시 기존 offline UI 유지 */
    }
  }, [organizationId, industryType]);

  useEffect(() => {
    let cancelled = false;

    void runHydrate(() => cancelled);

    return () => {
      cancelled = true;
    };
  }, [runHydrate, attempt]);

  /** web + native: online 시 pending flush 후 재 hydrate. native는 foreground도 동일 */
  useEffect(() => {
    const onOnline = () => {
      void runQuietRehydrate();
    };
    window.addEventListener('online', onOnline);

    const unregister = isNativeApp()
      ? registerForegroundStep('hydrate', () => runQuietRehydrate())
      : undefined;

    return () => {
      unregister?.();
      window.removeEventListener('online', onOnline);
    };
  }, [runQuietRehydrate]);

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-6 text-center"
        data-testid="storage-hydrate-error"
      >
        <p className="text-sm text-rose-600 max-w-sm">{error}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px] hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          다시 시도
        </button>
      </div>
    );
  }

  if (!ready) {
    return <LoadingScreen message="데이터를 불러오는 중..." />;
  }

  return (
    <>
      {offlineMode && (
        <div className="sticky top-0 z-40 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
          <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden />
          오프라인 모드 · 로컬 데이터를 사용 중입니다. 연결되면 자동 동기화됩니다.
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="underline min-h-[44px] px-1"
          >
            다시 동기화
          </button>
        </div>
      )}
      {children}
    </>
  );
};
