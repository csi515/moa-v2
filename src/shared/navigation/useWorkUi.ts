import { useActiveUser } from '@/shared/session/useActiveUser';
import { openConfirmDialog, showToast, triggerRefresh } from '@/shared/feedback/uiFeedback';
import { useNavSession } from './navSession';

/**
 * Core UI가 쓰는 업무 화면 상태.
 * AppContext를 re-export하지 않는다. nav session + Storage user + bound feedback.
 */
export function useWorkUi() {
  const currentUser = useActiveUser();
  const nav = useNavSession();
  return {
    currentUser,
    ...nav,
    showToast,
    openConfirmDialog,
    triggerRefresh,
  };
}
