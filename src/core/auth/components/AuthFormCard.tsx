import React, { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { LegalModal } from '@/core/legal';
import type { AuthMode } from '../hooks/useAuthForm';

interface AuthFormCardProps {
  mode: AuthMode;
  email: string;
  password: string;
  fullName: string;
  showPassword: boolean;
  agreedToTerms: boolean;
  loading: boolean;
  error: string | null;
  info: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onFullNameChange: (value: string) => void;
  onShowPasswordToggle: () => void;
  onAgreedToTermsChange: (value: boolean) => void;
  onSwitchMode: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent) => void;
}

export function AuthFormCard({
  mode,
  email,
  password,
  fullName,
  showPassword,
  agreedToTerms,
  loading,
  error,
  info,
  onEmailChange,
  onPasswordChange,
  onFullNameChange,
  onShowPasswordToggle,
  onAgreedToTermsChange,
  onSwitchMode,
  onSubmit,
}: AuthFormCardProps) {
  const [legalModalOpen, setLegalModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'terms' | 'privacy'>('terms');

  const openLegalModal = (tab: 'terms' | 'privacy', e: React.MouseEvent) => {
    e.preventDefault();
    setModalTab(tab);
    setLegalModalOpen(true);
  };

  const termsLabel = (
    <span>
      <button
        type="button"
        onClick={(e) => openLegalModal('terms', e)}
        className="text-indigo-600 underline font-semibold hover:text-indigo-800"
      >
        이용약관
      </button>
      과{' '}
      <button
        type="button"
        onClick={(e) => openLegalModal('privacy', e)}
        className="text-indigo-600 underline font-semibold hover:text-indigo-800"
      >
        개인정보처리방침
      </button>
      에 동의합니다 (필수)
    </span>
  );

  return (
    <>
      {mode !== 'forgot' && (
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            type="button"
            data-testid="tab-login" onClick={() => onSwitchMode('login')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors min-h-[44px] ${
              mode === 'login'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            data-testid="tab-signup" onClick={() => onSwitchMode('signup')}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-colors min-h-[44px] ${
              mode === 'signup'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            회원가입
          </button>
        </div>
      )}

      {mode === 'forgot' && (
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">비밀번호 찾기</h2>
          <button
            type="button"
            onClick={() => onSwitchMode('login')}
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 min-h-[44px] flex items-center"
          >
            로그인으로 돌아가기
          </button>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">이름 (실명)</label>
              <span className="text-[11px] text-slate-400">원장님, 직원, 수강생 이름</span>
            </div>
            <div className="relative">
              <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => onFullNameChange(e.target.value)}
                data-testid="signup-name-input" placeholder="홍길동"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">이메일 계정</label>
          <div className="relative">
            <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              data-testid="signup-email-input" placeholder="director@example.com"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {mode !== 'forgot' && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-slate-700">비밀번호</label>
              {mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => onSwitchMode('forgot')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  비밀번호를 잊으셨나요?
                </button>
              ) : (
                <span className="text-[11px] text-slate-400">영문·숫자 포함 6자 이상</span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                data-testid="signup-password-input"
                placeholder={mode === 'signup' ? '6자 이상 입력' : '••••••••'}
                minLength={6}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
              <button
                type="button"
                onClick={onShowPasswordToggle}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <div className="pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                data-testid="signup-terms-checkbox" onChange={(e) => onAgreedToTermsChange(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-600 leading-relaxed">{termsLabel}</span>
            </label>
          </div>
        )}

        {error && (
          <div
            className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700"
            data-testid={mode === 'login' ? 'auth-login-error' : undefined}
          >
            {error}
          </div>
        )}

        {info && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
            {info}
          </div>
        )}

        <button
          type="submit" data-testid="signup-submit-btn"
          disabled={loading}
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 min-h-[44px]"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'login' && '이메일로 로그인'}
          {mode === 'signup' && '이메일로 가입하기'}
          {mode === 'forgot' && '재설정 링크 보내기'}
        </button>
      </form>

      {/* 약관 및 개인정보처리방침 팝업 모달 */}
      <LegalModal
        isOpen={legalModalOpen}
        onClose={() => setLegalModalOpen(false)}
        initialTab={modalTab}
        onAgree={() => onAgreedToTermsChange(true)}
      />
    </>
  );
}
