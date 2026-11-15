import { useEffect, useCallback } from 'react';
import { useConfirmDialog } from '@/shared/feedback/useConfirmDialog';

export interface UseDirtyFormGuardOptions {
  /** 폼에 변경사항(미저장 데이터)이 존재하는지 여부 */
  isDirty: boolean;
  /** 브라우저 닫기/새로고침 시 표시할 메시지 */
  message?: string;
  /** 확인 모달 제목 (기본값: '작성 취소 확인') */
  confirmTitle?: string;
  /** 확인 모달 메시지 (기본값: '작성 중인 내용이 저장되지 않고 사라집니다. 정말 닫으시겠습니까?') */
  confirmMessage?: string;
}

/**
 * useDirtyFormGuard
 * 폼 작성 중 실수로 브라우저를 닫거나 모달을 닫는 이탈을 방지하는 상용 B2B 훅.
 *
 * 1. 브라우저 레벨: window beforeunload 이벤트 등록 (새로고침 / 탭 닫기 방어)
 * 2. 인앱 모달/네비게이션 레벨: confirmDiscard / handleModalConfirmClose 제공 (ConfirmDialog 연동)
 */
export function useDirtyFormGuard({
  isDirty,
  message = '작성 중인 변경사항이 저장되지 않았습니다. 정말 페이지를 벗어나시겠습니까?',
  confirmTitle = '작성 취소 확인',
  confirmMessage = '작성 중인 내용이 저장되지 않고 사라집니다. 정말 닫으시겠습니까?',
}: UseDirtyFormGuardOptions) {
  const confirm = useConfirmDialog();

  // 1. 브라우저 새로고침/탭 닫기 가드
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);

  // 2. 모달 confirmClose 또는 닫기 요청 시 사용할 비동기 확인 함수
  const confirmDiscard = useCallback(async (): Promise<boolean> => {
    if (!isDirty) return true;
    return await confirm({
      title: confirmTitle,
      message: confirmMessage,
      confirmText: '나가기',
      cancelText: '계속 작성',
      isDestructive: true,
    });
  }, [confirm, confirmMessage, confirmTitle, isDirty]);

  // 3. Modal 컴포넌트의 confirmClose prop과 바로 연결할 수 있는 핸들러
  const handleModalConfirmClose = useCallback(
    (proceed: () => void) => {
      if (!isDirty) {
        proceed();
        return;
      }
      void confirmDiscard().then((ok) => {
        if (ok) proceed();
      });
    },
    [confirmDiscard, isDirty]
  );

  return {
    confirmDiscard,
    handleModalConfirmClose,
  };
}
