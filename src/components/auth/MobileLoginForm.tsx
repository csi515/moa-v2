import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  ShieldCheck,
  Globe,
  Loader2,
  } from "lucide-react";
import { isAppsInToss } from "@/core/auth/domain/platformDetector";

/** SNS(OAuth) 로그인 — 연동 완료 전까지 클릭 비활성화 */
const SNS_LOGIN_ENABLED = true;

export type LoginTargetGroup = 'workplace' | 'customer';
export type WorkplaceRole = 'owner' | 'staff';

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
  rememberMe?: boolean;
  onRememberMeChange?: (remember: boolean) => void;
  returnUrl?: string;
  loginTargetGroup?: LoginTargetGroup;
  onLoginTargetGroupChange?: (group: LoginTargetGroup) => void;
  workplaceRole?: WorkplaceRole;
  onWorkplaceRoleChange?: (role: WorkplaceRole) => void;
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
  rememberMe: externalRememberMe,
  onRememberMeChange,
  returnUrl,
  loginTargetGroup: externalGroup,
  onLoginTargetGroupChange,
  workplaceRole: externalRole,
  onWorkplaceRoleChange,
}) => {
  const navigate = useNavigate();
  const [internalGroup, setInternalGroup] = useState<LoginTargetGroup>('workplace');
  const [internalRole, setInternalRole] = useState<WorkplaceRole>('owner');
  const [internalRememberMe, setInternalRememberMe] = useState(true);

  const targetGroup = externalGroup ?? internalGroup;
  const setTargetGroup = onLoginTargetGroupChange ?? setInternalGroup;

  const currentRole = externalRole ?? internalRole;
  const setCurrentRole = onWorkplaceRoleChange ?? setInternalRole;

  const isRemember = externalRememberMe ?? internalRememberMe;
  const setRemember = onRememberMeChange ?? setInternalRememberMe;

  const inToss = isAppsInToss();
  const isEn = language === 'en';

  const forgotPath = returnUrl
    ? `/signup?mode=forgot&returnUrl=${encodeURIComponent(returnUrl)}`
    : "/signup?mode=forgot";
  const signupPath = returnUrl
    ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}`
    : "/signup";

  // =========================================================================
  // 토스 환경 (Apps in Toss): 타사 소셜 배제 및 토스 원클릭 로그인 전용 화면
  // =========================================================================
  if (inToss) {
    return (
      <div data-testid="login-container" className="w-full space-y-6">
        <div className="flex items-center justify-center space-x-2 py-1 px-3 bg-blue-50 border border-blue-100 rounded-full mx-auto w-fit">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-[11px] font-semibold text-blue-700">토스 앱 보안 연동</span>
        </div>

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
                토스 계정과 매장 장부를 연결 중입니다.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              onClick={onTossLogin}
              disabled={isLoading || isTossLoading}
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-[#0064FF] hover:bg-[#0052D4] active:bg-[#0040A8] text-white text-sm font-semibold transition-all shadow-md shadow-blue-100 disabled:opacity-50"
            >
              <span>토스 간편 로그인</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <p className="text-center text-xs text-slate-400 leading-normal">
              토스 계정 인증만 제공됩니다.
            </p>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // 표준 정돈된 단일 화면:
  // [1. 최상위 2대 선택: 사업장 로그인 vs 고객 로그인]
  // [2. 사업장 선택 시 세부 역할: 사업주 vs 직원]
  // [3. 이메일/비밀번호 폼] -> [4. 회원가입/소셜 로그인]
  // =========================================================================
  return (
    <div data-testid="login-container" className="w-full space-y-4">


      {/* 3. 소셜 / 간편 로그인 버튼 순서 (테스트 불변식 준수) */}
      <div className="pt-1">
        {SNS_LOGIN_ENABLED ? (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-testid="btn-kakao-login"
              onClick={onKakaoLogin}
              disabled={isLoading}
              className="h-11 flex items-center justify-center space-x-2 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-current shrink-0" />
              <span>카카오 로그인</span>
            </button>
            <button
              type="button"
              data-testid="btn-naver-login"
              onClick={onNaverLogin}
              disabled={isLoading}
              className="h-11 flex items-center justify-center space-x-2 rounded-xl bg-[#03C75A] hover:bg-[#02B150] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <span className="font-extrabold text-sm leading-none font-sans">N</span>
              <span>네이버 로그인</span>
            </button>
          </div>
        ) : null}
      </div>

      {/* 4. 메인 이메일 / 비밀번호 폼 */}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            {isEn ? "Email" : "이메일"}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              id="login-email"
              data-testid="input-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full min-h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
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
            <Link
              to="/signup?mode=forgot"
              onClick={(e) => {
                if (returnUrl) {
                  e.preventDefault();
                  navigate(forgotPath);
                }
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 min-h-[32px] inline-flex items-center font-medium"
              data-testid="link-forgot-password"
            >
              {isEn ? "Forgot password?" : "비밀번호 찾기"}
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="login-password"
              data-testid="input-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full min-h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all bg-slate-50/50 focus:bg-white"
            />
          </div>
        </div>

        {/* 로그인 유지 체크박스 */}
        <div className="flex items-center justify-between py-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isRemember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500"
            />
            <span className="text-xs text-slate-600 font-medium">
              {isEn ? "Keep me signed in" : "로그인 상태 유지"}
            </span>
          </label>
          <span className="text-[11px] text-slate-400">
            {isEn ? "Shared device caution" : "공용 기기 해제 권장"}
          </span>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          data-testid="btn-email-submit"
          disabled={isLoading}
          className="w-full mt-2 h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-500 disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{isEn ? "Signing in..." : "로그인 중..."}</span>
            </>
          ) : (
            <span>{isEn ? "Sign in" : "로그인"}</span>
          )}
        </button>
      </form>

      {/* 5. 보조 링크 (초대 코드 등록) */}
      <div className="pt-1 text-center">
        <p className="text-xs text-slate-500">
          {isEn ? "Have an invite code? " : "초대 코드를 받으셨나요? "}
          <Link to="/invite/accept" className="font-bold text-indigo-600 hover:underline">
            {isEn ? "Accept invite code" : "초대 코드 등록"}
          </Link>
        </p>
      </div>

      {!SNS_LOGIN_ENABLED && (
        <p className="text-center text-xs text-slate-400" data-testid="sns-login-disabled-hint">
          {isEn ? "Social login is coming soon" : "간편 로그인은 준비 중입니다"}
        </p>
      )}

      {/* 6. 하단 회원가입 및 언어 전환 바 */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
        <Link
          to="/signup"
          onClick={(e) => {
            if (returnUrl) {
              e.preventDefault();
              navigate(signupPath);
            }
          }}
          data-testid="link-signup"
          className="text-xs text-slate-600 hover:text-indigo-600 font-bold inline-flex items-center gap-1 min-h-[44px]"
        >
          <span>{isEn ? "Need an account? Sign Up" : "계정이 없으신가요? 회원가입"}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        {onLanguageChange && (
          <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600 shrink-0">
            <Globe className="w-3.5 h-3.5 ml-1.5 text-slate-400" />
            <button
              type="button"
              onClick={() => onLanguageChange('ko')}
              className={`min-h-[44px] min-w-[44px] px-2 rounded-md transition-all ${
                !isEn ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              KO
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`min-h-[44px] min-w-[44px] px-2 rounded-md transition-all ${
                isEn ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              EN
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
