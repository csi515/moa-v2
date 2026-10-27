import { useEffect } from 'react';
import { GUARDIAN_LINK_PENDING_EVENT } from '@/core/platform/bootstrapDeepLinks';
import { peekPendingGuardianLink } from '@/core/parent/services/guardianLinkService';
import { isParentPortalModeActive } from '@/core/parent/services/appModeService';

/** 로그인 세션 중 보호자 딥링크 → 부모 포털 진입 */
export function useGuardianDeepLinkPortalSync(
  userId: string | undefined,
  enterParentPortal: () => void
): void {
  useEffect(() => {
    if (!userId) return;

    const enterIfPending = () => {
      if (peekPendingGuardianLink() || isParentPortalModeActive()) {
        enterParentPortal();
      }
    };

    enterIfPending();
    window.addEventListener(GUARDIAN_LINK_PENDING_EVENT, enterIfPending);
    return () => window.removeEventListener(GUARDIAN_LINK_PENDING_EVENT, enterIfPending);
  }, [userId, enterParentPortal]);
}
