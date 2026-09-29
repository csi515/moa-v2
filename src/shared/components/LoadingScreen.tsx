import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

/** 앱 전체 초기화 전용. 페이지 데이터는 Skeleton, 버튼은 내부 spinner. */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '불러오는 중...' }) => (
  <div
    className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 p-6"
    data-testid="app-loading"
  >
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      <p className="text-base font-semibold text-slate-700 text-center">{message}</p>
      <p className="text-xs text-slate-400 text-center max-w-sm">잠시만 기다려 주세요</p>
    </div>
  </div>
);
