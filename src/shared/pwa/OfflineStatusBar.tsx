import React, { useEffect, useState } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from './networkStatus';

export interface OfflineStatusBarProps {
  className?: string;
  onRetrySync?: () => void;
}

/**
 * PWA & Desktop 상시 오프라인 감지 및 복구 상태 표시줄
 * 
 * - 네트워크 두절 시 주황색 경고 배너로 안전한 오프라인 작업 중임을 명시
 * - 재연결 시 3초간 초록색 복구 완료 피드백 후 자연스러운 자동 페이드아웃
 * - 접근성 aria-live="polite", role="status" 준수
 */
export const OfflineStatusBar: React.FC<OfflineStatusBarProps> = ({
  className = '',
  onRetrySync,
}) => {
  const { isOnline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setHasBeenOffline(true);
      setShowReconnected(false);
    } else if (hasBeenOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setHasBeenOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, hasBeenOffline]);

  // 상시 온라인 상태이고 재연결 피드백도 없으면 렌더링하지 않음
  if (isOnline && !showReconnected) {
    return null;
  }

  if (!isOnline) {
    return (
      <aside
        role="status"
        aria-live="polite"
        className={`fixed top-0 inset-x-0 z-[9999] bg-amber-600 text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs sm:text-sm font-medium transition-all duration-300 animate-in slide-in-from-top ${className}`}
      >
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          <WifiOff className="w-4 h-4 shrink-0 text-amber-200 animate-pulse" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <span className="font-bold">네트워크 연결 끊김</span>
            <span className="hidden sm:inline text-amber-100 ml-1.5">
              — 현재 오프라인 모드로 안전하게 작동 중입니다. 연결 시 데이터가 자동 동기화됩니다.
            </span>
          </div>
          {onRetrySync && (
            <button
              type="button"
              onClick={onRetrySync}
              className="px-2.5 py-1 rounded bg-amber-700 hover:bg-amber-800 text-amber-50 text-xs font-semibold shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>동기화 시도</span>
            </button>
          )}
        </div>
      </aside>
    );
  }

  // 재연결 안내 배너
  return (
    <aside
      role="status"
      aria-live="polite"
      className={`fixed top-0 inset-x-0 z-[9999] bg-emerald-600 text-white px-4 py-2.5 shadow-md flex items-center justify-center text-xs sm:text-sm font-medium transition-all duration-300 animate-in slide-in-from-top ${className}`}
    >
      <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-center">
        <Wifi className="w-4 h-4 shrink-0 text-emerald-200" aria-hidden="true" />
        <span className="font-bold">네트워크가 다시 연결되었습니다.</span>
        <span className="hidden sm:inline text-emerald-100">
          최신 데이터 동기화를 진행합니다.
        </span>
      </div>
    </aside>
  );
};
