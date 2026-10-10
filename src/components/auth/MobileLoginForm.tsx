import React from "react";
import { Mail, Lock, ArrowRight, RefreshCw, MessageSquare, ShieldCheck, Globe } from "lucide-react";
import { isAppsInToss } from "@/core/auth/domain/platformDetector";

export interface MobileLoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  onGoogleLogin?: () => void;
  onAppleLogin?: () => void;
  onKakaoLogin?: () => void;
  onNaverLogin?: () => void;
  onTossLogin?: () => void;
  isTossLoading?: boolean;
  language?: 'ko' | 'en';
  onLanguageChange?: (lang: 'ko' | 'en') => void;
}

export const MobileLoginForm: React.FC<MobileLoginFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  isLoading,
  errorMessage,
  onGoogleLogin,
  onAppleLogin,
  onKakaoLogin,
  onNaverLogin,
  onTossLogin,
  isTossLoading = false,
  language = 'ko',
  onLanguageChange,
}) => {
  const inToss = isAppsInToss();
  const isEn = language === 'en';

  // =========================================================================
  // 토스 환경 (Apps in Toss): 타사 소셜 배제 및 토스 원클릭 로그인 전용 화면
  // =========================================================================
  if (inToss) {
    return (
      <div className="w-full space-y-6">
        {/* 토스 환경 브랜드 배지 */}
        <div className="flex items-center justify-center space-x-2 py-1 px-3 bg-blue-50 border border-blue-100 rounded-full mx-auto w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold text-blue-700">토스 앱 보안 연동</span>
        </div>

        {/* 로딩 진행 중 상태 (자동 로그인 진행 시) */}
        {isTossLoading || isLoading ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                토스 원클릭 자동 로그인 중
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                토스 계정과 매장 장부(이용권·출결)를 안전하게 연결하고 있습니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 에러 피드백 */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in">
                {errorMessage}
              </div>
            )}

            {/* 토스 원클릭 로그인 버튼 */}
            <button
              type="button"
              onClick={onTossLogin}
              disabled={isLoading || isTossLoading}
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-[#0064FF] hover:bg-[#0052D4] active:bg-[#0040A8] text-white text-sm font-semibold transition-all shadow-md shadow-blue-100 disabled:opacity-50"
            >
              <span>토스 원클릭으로 간편 로그인</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <p className="text-center text-[11px] text-slate-400 leading-normal">
              토스 앱 검수 기준에 따라 토스 계정 인증만 제공됩니다.
            </p>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 글로벌 / 국내 표준 단일 화면 정렬:
  // [Google] -> [Apple] -> [Kakao & Naver 2열 컴팩트] -> [이메일/비밀번호]
  // =========================================================================
  return (
    <div className="w-full space-y-5">
      {/* 상단 다국어 선택 토글 (국내 외국인/학부모 배려) */}
      {onLanguageChange && (
        <div className="flex justify-end items-center">
          <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
            <Globe className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
            <button
              type="button"
              onClick={() => onLanguageChange('ko')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                !isEn ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              한국어
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-0.5 rounded-md transition-all ${
                isEn ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              English
            </button>
          </div>
        </div>
      )}

      {/* 1. Google 로그인 (외국인·글로벌 사용자 최우선 접근성) */}
      <button
        type="button"
        onClick={onGoogleLogin}
        disabled={isLoading}
        className="w-full h-12 flex items-center justify-center space-x-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 text-sm font-semibold transition-all shadow-xs disabled:opacity-50"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>{isEn ? "Continue with Google" : "Google로 계속하기"}</span>
      </button>

      {/* 2. Apple 로그인 (iOS App Store 심사 필수) */}
      <button
        type="button"
        onClick={onAppleLogin}
        disabled={isLoading}
        className="w-full h-12 flex items-center justify-center space-x-2.5 rounded-xl bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white text-sm font-semibold transition-all shadow-xs disabled:opacity-50"
      >
        <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.58.67-.99 1.74-.88 2.76 1.01.08 2.03-.54 2.6-1.26z" />
        </svg>
        <span>{isEn ? "Sign in with Apple" : "Apple로 계속하기"}</span>
      </button>

      {/* 3. Kakao & Naver 2열 컴팩트 그리드 */}
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onKakaoLogin}
          disabled={isLoading}
          className="h-11 flex items-center justify-center space-x-1.5 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] text-xs font-semibold transition-all shadow-2xs disabled:opacity-50"
        >
          <MessageSquare className="w-3.5 h-3.5 fill-current shrink-0" />
          <span>카카오 로그인</span>
        </button>

        <button
          type="button"
          onClick={onNaverLogin}
          disabled={isLoading}
          className="h-11 flex items-center justify-center space-x-1.5 rounded-xl bg-[#03C75A] hover:bg-[#02B150] text-white text-xs font-semibold transition-all shadow-2xs disabled:opacity-50"
        >
          <span className="font-extrabold text-sm leading-none font-sans">N</span>
          <span>네이버 로그인</span>
        </button>
      </div>

      {/* 구분선 */}
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-slate-400">
            {isEn ? "or continue with email" : "또는 이메일 계정으로 로그인"}
          </span>
        </div>
      </div>

      {/* 4. 이메일 / 비밀번호 폼 */}
      <form onSubmit={onSubmit} className="space-y-3.5">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            {isEn ? "Email address" : "이메일 계정"}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@moa.app"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700"
            >
              {isEn ? "Password" : "비밀번호"}
            </label>
            <span className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer">
              {isEn ? "Forgot password?" : "비밀번호 찾기"}
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>{isEn ? "Sign in" : "로그인"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-xs text-slate-400 pt-1">
        {isEn ? "Don't have an account? " : "계정이 없으신가요? "}
        <span className="font-semibold text-indigo-600 hover:underline cursor-pointer">
          {isEn ? "Sign up" : "사업장 개설 및 무료 회원가입"}
        </span>
      </p>
    </div>
  );
};
