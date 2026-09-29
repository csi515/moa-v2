import React from 'react';
import { AuthFormCard } from './components/AuthFormCard';
import { AuthLayout } from './components/AuthLayout';
import { useAuthForm } from './hooks/useAuthForm';

export const AuthPage: React.FC = () => {
  const form = useAuthForm();

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
        onEmailChange={form.setEmail}
        onPasswordChange={form.setPassword}
        onFullNameChange={form.setFullName}
        onShowPasswordToggle={() => form.setShowPassword((prev) => !prev)}
        onAgreedToTermsChange={form.setAgreedToTerms}
        onSwitchMode={form.switchMode}
        onSubmit={form.handleSubmit}
      />
    </AuthLayout>
  );
};
