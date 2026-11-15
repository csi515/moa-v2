import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, LogOut, AlertCircle } from 'lucide-react';
import { requestSignOut } from '@/core/auth/services/signOutCoordinator';

interface LoadingScreenProps {
  message?: string;
  timeoutMs?: number;
  onRetry?: () => void;
}

/**
 * 앱 전체 초기화 전용 로딩 스크린.
 * 8초 이상 지연 시 새로고침/재시도/로그아웃 탈출 UI를 노출하여 무한 로딩을 방지합니다.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = '불러오는 중...',
  timeoutMs = 8000,
  onRetry,
}) => {
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    if (!timeoutMs || timeoutMs <= 0) return;
    const timer = setTimeout(() => {
      setIsTimedOut(true);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, [timeoutMs]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const handleForceLogout = async () => {
    try {
      await requestSignOut({ force: true });
    } finally {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-6"
      data-testid="app-loading"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 max-w-sm w-full text-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-base font-semibold text-slate-800">{message}</p>
        <p className="text-xs text-slate-400">잠시만 기다려 주세요</p>

        {isTimedOut && (
          <div className="mt-5 w-full rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-left shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-900">
                  응답이 평소보다 지연되고 있습니다
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-800">
                  인터넷 연결이 불안정하거나 서버 응답이 늦어질 수 있습니다. 새로고침을 하거나 다시 로그인해 보세요.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-amber-200/60">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="flex-1 flex items-center justify-center gap-1.5 min-h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  다시 시도
                </button>
              )}
              <button
                type="button"
                onClick={handleReload}
                className="flex-1 flex items-center justify-center gap-1.5 min-h-9 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                새로고침
              </button>
              <button
                type="button"
                onClick={handleForceLogout}
                className="flex items-center justify-center gap-1 min-h-9 px-3 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그인 화면으로
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default LoadingScreen;
