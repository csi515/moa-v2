import { StorageService } from '@/services/storage';
import * as authService from './authService';
import * as orgService from '@/core/organizations/services/organizationService';
import { clearLocalPushTokensForUser, resetAppPushRegistrationContext } from '@/core/push';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';

export const SIGN_OUT_COPY = {
  unsyncedTitle: '저장되지 않은 변경사항',
  unsyncedBody:
    '저장되지 않은 변경사항이 있습니다.\n인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  retry: '다시 시도',
  cancel: '취소',
  forceAction: '로그아웃',
  forceTitle: '로그아웃',
  forceBody:
    '저장되지 않은 변경사항은 복구되지 않을 수 있습니다.\n그래도 로그아웃하시겠습니까?',
} as const;

type PromptListener = (prompt: ConfirmDialogOptions | null) => void;
type CompletionListener = () => void;
type QueryClientClearListener = () => void;

let promptListener: PromptListener | null = null;
const completionListeners = new Set<CompletionListener>();
const queryClientClearListeners = new Set<QueryClientClearListener>();
let testAuthSignOutHandler: (() => Promise<void>) | null = null;

export function registerPromptListener(listener: PromptListener): () => void {
  promptListener = listener;
  return () => {
    if (promptListener === listener) {
      promptListener = null;
    }
  };
}

export function registerCompletionListener(listener: CompletionListener): () => void {
  completionListeners.add(listener);
  return () => {
    completionListeners.delete(listener);
  };
}

export function registerQueryClientClear(listener: QueryClientClearListener): () => void {
  queryClientClearListeners.add(listener);
  return () => {
    queryClientClearListeners.delete(listener);
  };
}

export function setTestAuthSignOutHandler(handler: (() => Promise<void>) | null): void {
  testAuthSignOutHandler = handler;
}

export function dismissPrompt(): void {
  if (promptListener) {
    promptListener(null);
  }
}

/**
 * 실제로 미전송된 offline pending mutation이 있는지 확인.
 * 단순 로컬 캐시 존재는 pending mutation으로 취급하지 않음.
 */
export function hasPendingOfflineMutations(): boolean {
  return StorageService.hasUnsyncedBusinessChanges();
}

/**
 * 모든 세션, 캐시, 조직, 푸시 컨텍스트를 안전하게 정리하고 Supabase Auth에서 로그아웃.
 */
export async function completeSignOut(options?: { discardUnsynced?: boolean }): Promise<void> {
  const activeUser = StorageService.getActiveUser();
  const userId = activeUser?.id;

  // 1. Push 컨텍스트 정리
  if (userId) {
    try {
      clearLocalPushTokensForUser(userId);
    } catch (err) {
      console.warn('[signOutCoordinator] push token cleanup warning:', err);
    }
  }
  try {
    resetAppPushRegistrationContext();
  } catch (err) {
    console.warn('[signOutCoordinator] push registration reset warning:', err);
  }

  // 2. Organization 컨텍스트 정리
  try {
    StorageService.clearOrganization();
  } catch (err) {
    console.warn('[signOutCoordinator] storage clearOrganization warning:', err);
  }
  try {
    orgService.clearStoredOrganizationId();
  } catch (err) {
    console.warn('[signOutCoordinator] orgService clearStoredOrganizationId warning:', err);
  }

  // 3. Business Caches 정리 (단, device-only 설정은 유지)
  try {
    StorageService.clearBusinessCachesOnSignOut();
  } catch (err) {
    console.warn('[signOutCoordinator] clearBusinessCachesOnSignOut warning:', err);
  }

  // 4. QueryClient 캐시 정리
  queryClientClearListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore */
    }
  });

  // 5. Supabase 세션 종료
  if (testAuthSignOutHandler) {
    try {
      await testAuthSignOutHandler();
    } catch (err) {
      console.warn('[signOutCoordinator] test auth signOut warning:', err);
    }
  } else if (isSupabaseConfigured()) {
    try {
      await authService.signOut();
    } catch (err) {
      console.warn('[signOutCoordinator] Supabase signOut warning:', err);
    }
  }

  // 6. 완료 리스너 통지 (React AuthProvider의 setSession(null) 등)
  completionListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* ignore */
    }
  });
}

function openForcePrompt(onConfirm: () => Promise<void>) {
  if (!promptListener) return;
  promptListener({
    title: SIGN_OUT_COPY.forceTitle,
    message: SIGN_OUT_COPY.forceBody,
    confirmText: SIGN_OUT_COPY.forceAction,
    cancelText: SIGN_OUT_COPY.cancel,
    isDestructive: true,
    onConfirm: () => {
      dismissPrompt();
      void onConfirm();
    },
  });
}

/**
 * 통합 로그아웃 진입점 (Refine authProvider와 MOA AuthProvider 공통 사용).
 *
 * - 온라인 + pending 없음: 즉시 completeSignOut() 호출 후 'signed_out' 반환.
 * - 실제 pending offline mutation 존재:
 *   1) prepareSignOut()으로 flush 시도.
 *   2) 성공하여 pending 해소 시 즉시 completeSignOut() 호출 후 'signed_out' 반환.
 *   3) 오프라인 등으로 여전히 blocked 시 사용자 다이얼로그 표시 후 'blocked' 반환.
 */
export async function requestSignOut(options?: { force?: boolean }): Promise<'signed_out' | 'blocked'> {
  // 1. 강제 로그아웃인 경우 즉시 진행
  if (options?.force) {
    dismissPrompt();
    await completeSignOut({ discardUnsynced: true });
    return 'signed_out';
  }

  // 2. 실제 pending offline mutation이 없는 경우 (일반적인 온라인 상태)
  if (!hasPendingOfflineMutations()) {
    dismissPrompt();
    await completeSignOut();
    return 'signed_out';
  }

  // 3. 실제 pending offline mutation이 있는 경우: flush 시도
  const prepared = await StorageService.prepareSignOut({ discardUnsynced: false });
  if (prepared === 'ready') {
    dismissPrompt();
    await completeSignOut();
    return 'signed_out';
  }

  // 4. 여전히 blocked (오프라인이거나 sync 실패) -> 사용자 안내 팝업 표시
  if (promptListener) {
    promptListener({
      title: SIGN_OUT_COPY.unsyncedTitle,
      message: SIGN_OUT_COPY.unsyncedBody,
      confirmText: SIGN_OUT_COPY.retry,
      cancelText: SIGN_OUT_COPY.cancel,
      altText: SIGN_OUT_COPY.forceAction,
      onConfirm: () => {
        void (async () => {
          const res = await requestSignOut();
          if (res === 'signed_out' && typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        })();
      },
      onAlt: () => {
        openForcePrompt(async () => {
          await completeSignOut({ discardUnsynced: true });
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        });
      },
    });
  }

  return 'blocked';
}
