import React from 'react';
import { useFeedbackStore } from '@/shared/feedback/feedbackStore';
import { Toaster } from 'sonner';
import { WorkStatusBanner } from './WorkStatusBanner';
import { OfflineStatusBar } from '@/shared/pwa/OfflineStatusBar';

/**
 * Moa-v2 전역 피드백 컨테이너
 * - Sonner 기반 모던 토스트 렌더링 (스와이프 제스처, 접근성, Promise 연동)
 * - 장기 비동기 작업용 WorkStatusBanner 렌더링
 * - 오프라인/재연결 감지 배너 (OfflineStatusBar) 전역 연동
 */
export const ToastContainer: React.FC = () => {
  const { workStatus, clearWorkStatus } = useFeedbackStore();

  return (
    <>
      <OfflineStatusBar />
      {workStatus && (
        <div className="fixed mobile-overlay-bottom left-4 right-20 md:left-auto md:right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-auto">
          <WorkStatusBanner status={workStatus} onDismiss={clearWorkStatus} />
        </div>
      )}
      <Toaster
        position="bottom-center"
        richColors
        closeButton
        duration={3500}
        theme="light"
        toastOptions={{
          className: 'rounded-xl shadow-xl border font-sans',
          style: {
            fontFamily: 'inherit',
          },
        }}
      />
    </>
  );
};
