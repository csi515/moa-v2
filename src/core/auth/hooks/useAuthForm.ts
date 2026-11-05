import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../AuthProvider';
import * as authService from '../services/authService';
import { consumeOAuthCallbackError } from '../oauthCallbackError';
import { saveOAuthSignupIntent } from '../utils/oauthSignupIntent';

export type AuthMode = 'login' | 'signup' | 'forgot';

function resolveInitialMode(pathname: string, search: string): AuthMode {
  const params = new URLSearchParams(search);
  const queryMode = params.get('mode');
  if (queryMode === 'forgot') return 'forgot';
  if (queryMode === 'signup') return 'signup';
  if (queryMode === 'login') return 'login';
  if (pathname.endsWith('/signup')) return 'signup';
  return 'login';
}

export function useAuthForm() {
  const { signIn, signUp, signInWithNaver } = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>(() =>
    resolveInitialMode(location.pathname, location.search)
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    setMode(resolveInitialMode(location.pathname, location.search));
  }, [location.pathname, location.search]);

  useEffect(() => {
    const oauthError = consumeOAuthCallbackError();
    if (!oauthError) return;
    setError(oauthError);
  }, []);

  const switchMode = useCallback((next: AuthMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setEmailPending(false);
  }, []);

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError('이메일을 입력해 주세요.');
      return;
    }
    setError(null);
    setInfo(null);
    setResendLoading(true);
    try {
      await authService.resendSignupConfirmation(email.trim());
      setInfo('확인 메일을 다시 보냈습니다. 받은편지함을 확인해 주세요.');
    } catch (err) {
      setError(err instanceof Error ? err.message : '확인 메일 재발송에 실패했습니다.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleNaver = async () => {
    setError(null);
    setInfo(null);

    try {
      if (mode === 'signup') {
        if (!agreedToTerms) {
          throw new Error('이용약관 및 개인정보처리방침에 동의해 주세요.');
        }
        saveOAuthSignupIntent({
          mode: 'signup',
          fullName: fullName.trim() || undefined,
        });
      } else if (mode === 'forgot') {
        throw new Error('비밀번호 찾기는 이메일로 진행해 주세요.');
      } else {
        saveOAuthSignupIntent({ mode: 'login' });
      }

      setLoading(true);
      await signInWithNaver();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '네이버 로그인 중 오류가 발생했습니다.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await authService.resetPassword(email);
        setInfo('비밀번호 재설정 링크를 이메일로 보냈습니다. 받은편지함을 확인해 주세요.');
        return;
      }

      if (mode === 'login') {
        await signIn(email.trim(), password);
        return;
      }

      if (!fullName.trim()) {
        throw new Error('이름을 입력해 주세요.');
      }
      if (password.length < 6) {
        throw new Error('비밀번호는 6자 이상이어야 합니다.');
      }
      if (!agreedToTerms) {
        throw new Error('이용약관 및 개인정보처리방침에 동의해 주세요.');
      }

      const result = await signUp(email.trim(), password, fullName.trim());
      if (result.emailPending) {
        setEmailPending(true);
        setInfo(
          '가입 확인 메일을 보냈습니다. 메일함의 링크를 누른 뒤 로그인해 주세요.'
        );
      }
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : '인증 처리 중 오류가 발생했습니다.';
      const message = /already registered|already been registered|User already exists/i.test(
        raw
      )
        ? '이미 다른 방법으로 가입된 이메일입니다. 기존 로그인 수단으로 로그인해 주세요.'
        : raw;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    email,
    setEmail,
    password,
    setPassword,
    fullName,
    setFullName,
    showPassword,
    setShowPassword,
    agreedToTerms,
    setAgreedToTerms,
    loading,
    error,
    info,
    emailPending,
    resendLoading,
    switchMode,
    handleSubmit,
    handleNaver,
    handleResendConfirmation,
  };
}
