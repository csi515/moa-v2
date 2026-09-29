import { useCallback, useEffect, useState } from 'react';
import {
  clearPendingGuardianLink,
  peekPendingGuardianLink,
  previewGuardianLinkToken,
  redeemGuardianLinkToken,
} from '@/core/parent/services/guardianLinkService';
import { normalizeGuardianLinkCode } from '@/core/platform/deepLinkParser';

type ToastFn = (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;

/**
 * 보호자 연결 코드 preview → 동의 → redeem 흐름
 * preview 실패 시 session pending 토큰은 유지(재시도)
 */
export function useGuardianLinkRedeem(params: {
  showToast: ToastFn;
  refreshPortalTree: () => Promise<unknown> | unknown;
}) {
  const { showToast, refreshPortalTree } = params;
  const [redeeming, setRedeeming] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<{
    organizationName: string;
    studentName: string;
  } | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  const runRedeem = useCallback(
    async (token: string) => {
      setRedeeming(true);
      try {
        const result = await redeemGuardianLinkToken(token);
        if (!result.success) {
          // 무효·만료 코드는 재시도해도 소용없으므로 pending 제거 (rate limit 은 유지)
          if (result.status !== 'rate_limited') clearPendingGuardianLink();
          showToast(
            result.errorMessage ?? '연결에 실패했습니다. 코드를 다시 확인해 주세요.',
            'error'
          );
          return false;
        }
        clearPendingGuardianLink();
        setLinkPreview(null);
        const mergeNote =
          result.mergedDuplicates && result.mergedDuplicates > 0
            ? ' (기존 자녀 정보와 통합됨)'
            : '';
        if (result.status === 'linked_enrollment_pending') {
          showToast(
            `${result.organizationName} · ${result.studentName} 연결 완료. 현재 퇴원 상태라 사업장 승인 후 다시 등록됩니다.`,
            'info'
          );
        } else {
          showToast(
            `${result.organizationName} · ${result.studentName} 연결 완료${mergeNote}`,
            'success'
          );
        }
        await refreshPortalTree();
        return true;
      } catch (err) {
        showToast(err instanceof Error ? err.message : '연결 코드가 유효하지 않습니다.', 'error');
        return false;
      } finally {
        setRedeeming(false);
        setPendingToken(null);
        setShowConsent(false);
      }
    },
    [refreshPortalTree, showToast]
  );

  const requestRedeem = useCallback(
    (token: string) => {
      const code = normalizeGuardianLinkCode(token);
      if (!code) return;
      void (async () => {
        try {
          const preview = await previewGuardianLinkToken(code);
          setPendingToken(code);
          setLinkPreview(preview);
          setShowConsent(true);
        } catch (err) {
          setPendingToken(null);
          setLinkPreview(null);
          setShowConsent(false);
          showToast(
            err instanceof Error ? err.message : '연결 코드가 유효하지 않습니다.',
            'error'
          );
        }
      })();
    },
    [showToast]
  );

  const cancelLinkConsent = useCallback(() => {
    clearPendingGuardianLink();
    setPendingToken(null);
    setLinkPreview(null);
    setShowConsent(false);
  }, []);

  useEffect(() => {
    const pending = peekPendingGuardianLink();
    if (!pending) return;
    requestRedeem(pending);
  }, [requestRedeem]);

  return {
    redeeming,
    pendingToken,
    linkPreview,
    showConsent,
    runRedeem,
    requestRedeem,
    cancelLinkConsent,
  };
}
