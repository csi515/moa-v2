import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as authService from './services/authService';
import { loginWithToss } from './services/tossAuthService';
import {
  requestSignOut,
  registerPromptListener,
  registerCompletionListener,
  dismissPrompt,
} from './services/signOutCoordinator';
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
  signInWithToss: () => Promise<void>;
  signOut: (options?: { force?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    const unregisterPrompt = registerPromptListener(setSignOutPrompt);
    const unregisterCompletion = registerCompletionListener(() => setSession(null));
    return () => {
      unregisterPrompt();
      unregisterCompletion();
    };
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

  const signInWithToss = async () => {
    const result = await loginWithToss();
    if (!result.success) {
      throw new Error(result.error || '토스 로그인에 실패했습니다.');
    }
  };

  const signOut = async (options?: { force?: boolean }) => {
    await requestSignOut(options);
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
        signInWithToss,
        signOut,
      }}
    >
      {children}
      <ConfirmDialog options={signOutPrompt} onDismiss={dismissPrompt} />
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
