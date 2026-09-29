import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../AuthProvider';
import * as authService from '../services/authService';
import { consumeOAuthCallbackError } from '../oauthCallbackError';
import { saveOAuthSignupIntent } from '../utils/oauthSignupIntent';

export type AuthMode = 'login' | 'signup' | 'forgot';

export function useAuthForm() {
  const { signIn, signUp, signInWithNaver } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    const oauthError = consumeOAuthCallbackError();
    if (!oauthError) return;
    setError(oauthError);
  }, []);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setInfo(null);
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
      // OAuth 리다이렉트가 실패·차단되면 버튼을 다시 활성화
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

      // 역할·사업장은 가입 후 OrganizationSelector / 초대·연결에서 결정
      await signUp(email.trim(), password, fullName.trim());
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
    switchMode,
    handleSubmit,
    handleNaver,
  };
}
