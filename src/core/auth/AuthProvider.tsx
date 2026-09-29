import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { StorageService } from '../../services/storage';
import * as authService from './services/authService';
import { clearLocalPushTokensForUser, resetAppPushRegistrationContext } from '@/core/push';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import type { ConfirmDialogOptions } from '@/shared/feedback/confirmTypes';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signInWithKakao: () => Promise<void>;
  signInWithNaver: () => Promise<void>;
  signOut: (options?: { force?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SIGN_OUT_COPY = {
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

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signOutPrompt, setSignOutPrompt] = useState<ConfirmDialogOptions | null>(null);

  useEffect(() => {
    authService
      .getSession()
      .then(setSession)
      .finally(() => setLoading(false));

    return authService.onAuthStateChange(setSession);
  }, []);

  const signIn = async (email: string, password: string) => {
    const newSession = await authService.signIn({ email, password });
    setSession(newSession);
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { session: newSession } = await authService.signUp({
      email,
      password,
      fullName,
    });
    if (newSession) {
      setSession(newSession);
      return;
    }
    const nextSession = await authService.signIn({ email, password });
    setSession(nextSession);
  };

  const signInWithKakao = async () => {
    await authService.signInWithKakao();
  };

  const signInWithNaver = async () => {
    await authService.signInWithNaver();
  };

  const completeSignOut = async () => {
    const userId = session?.user?.id;
    StorageService.clearOrganization();
    StorageService.clearBusinessCachesOnSignOut();
    if (userId) clearLocalPushTokensForUser(userId);
    resetAppPushRegistrationContext();
    await authService.signOut();
    setSession(null);
  };

  const openForcePrompt = () => {
    setSignOutPrompt({
      title: SIGN_OUT_COPY.forceTitle,
      message: SIGN_OUT_COPY.forceBody,
      confirmText: SIGN_OUT_COPY.forceAction,
      cancelText: SIGN_OUT_COPY.cancel,
      isDestructive: true,
      onConfirm: () => {
        void completeSignOut();
      },
    });
  };

  const signOut = async (options?: { force?: boolean }) => {
    if (options?.force) {
      setSignOutPrompt(null);
      await completeSignOut();
      return;
    }

    const prepared = await StorageService.prepareSignOut();
    if (prepared === 'blocked') {
      setSignOutPrompt({
        title: SIGN_OUT_COPY.unsyncedTitle,
        message: SIGN_OUT_COPY.unsyncedBody,
        confirmText: SIGN_OUT_COPY.retry,
        cancelText: SIGN_OUT_COPY.cancel,
        altText: SIGN_OUT_COPY.forceAction,
        onConfirm: () => {
          void signOut();
        },
        onAlt: openForcePrompt,
      });
      return;
    }

    setSignOutPrompt(null);
    await completeSignOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signIn,
        signUp,
        signInWithKakao,
        signInWithNaver,
        signOut,
      }}
    >
      {children}
      <ConfirmDialog options={signOutPrompt} onDismiss={() => setSignOutPrompt(null)} />
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/** AuthProvider 외부에서도 안전하게 사용 (localStorage 모드) */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext) ?? null;
}
