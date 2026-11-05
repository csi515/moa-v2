import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthFormCard } from './components/AuthFormCard';
import { AuthLayout } from './components/AuthLayout';
import { useAuthForm, type AuthMode } from './hooks/useAuthForm';

/**
 * 이메일 회원가입·비밀번호 찾기 공개 화면.
 * 로그인 탭은 소셜 로그인이 있는 /login으로 보낸다.
 */
export const AuthPage: React.FC = () => {
  const form = useAuthForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { switchMode } = form;
  const searchParams = new URLSearchParams(location.search);
  const rawReturnUrl = searchParams.get('returnUrl');
  const returnUrl =
    rawReturnUrl && rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')
      ? rawReturnUrl
      : null;

  const handleSwitchMode = useCallback(
    (next: AuthMode) => {
      if (next === 'login') {
        const loginParam = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
        navigate(`/login${loginParam}`);
        return;
      }
      switchMode(next);
      if (next === 'signup') {
        navigate(returnUrl ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}` : '/signup', { replace: true });
      } else if (next === 'forgot') {
        const returnParam = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
        navigate(`/signup?mode=forgot${returnParam}`, { replace: true });
      }
    },
    [switchMode, navigate, returnUrl]
  );

  return (
    <AuthLayout mode={form.mode}>
      <AuthFormCard
        mode={form.mode}
        email={form.email}
        password={form.password}
        fullName={form.fullName}
        showPassword={form.showPassword}
        agreedToTerms={form.agreedToTerms}
        loading={form.loading}
        error={form.error}
        info={form.info}
        emailPending={form.emailPending}
        resendLoading={form.resendLoading}
        onEmailChange={form.setEmail}
        onPasswordChange={form.setPassword}
        onFullNameChange={form.setFullName}
        onShowPasswordToggle={() => form.setShowPassword((prev) => !prev)}
        onAgreedToTermsChange={form.setAgreedToTerms}
        onSwitchMode={handleSwitchMode}
        onSubmit={form.handleSubmit}
        onResendConfirmation={() => void form.handleResendConfirmation()}
      />
    </AuthLayout>
  );
};
