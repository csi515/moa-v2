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
  Building2,
  UserRound,
  Crown,
  Briefcase,
  KeyRound,
  UserPlus,
} from "lucide-react";
import { isAppsInToss } from "@/core/auth/domain/platformDetector";

/** SNS(OAuth) 로그인 — 연동 완료 전까지 클릭 비활성화 */
const SNS_LOGIN_ENABLED = false;

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
      {/* 1. 최상위 2대 분류: 사업장 로그인 vs 고객 로그인 */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
        <button
          type="button"
          onClick={() => setTargetGroup('workplace')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            targetGroup === 'workplace'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4 text-indigo-600" />
          <span>{isEn ? "Workplace" : "사업장 로그인"}</span>
        </button>

        <button
          type="button"
          onClick={() => setTargetGroup('customer')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            targetGroup === 'customer'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserRound className="w-4 h-4 text-emerald-600" />
          <span>{isEn ? "Customer" : "고객 로그인"}</span>
        </button>
      </div>

      {/* 2. 사업장 로그인 내부: 사업주 vs 직원 선택 */}
      {targetGroup === 'workplace' ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-600">
              {isEn ? "Select Role" : "로그인 역할 선택"}
            </span>
            <span className="text-xs text-indigo-600 font-medium">
              {currentRole === 'owner' ? '매장 개설·운영·정산' : '출결·스케줄·담당 업무'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/90 rounded-xl border border-indigo-100/80">
            <button
              type="button"
              onClick={() => setCurrentRole('owner')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                currentRole === 'owner'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{isEn ? "Owner" : "사업주 · 대표"}</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentRole('staff')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-xs font-bold transition-all ${
                currentRole === 'staff'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{isEn ? "Staff" : "직원 · 강사"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-2.5 px-3">
          <div className="flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <UserRound className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{isEn ? "Member Pass & Booking Portal" : "회원권·출결·예약 전용 로그인"}</span>
          </div>
        </div>
      )}

      {/* 3. 소셜 / 간편 로그인 버튼 순서 (테스트 불변식 준수) */}
      <div className="pt-1">
        {SNS_LOGIN_ENABLED ? (
          <div className="space-y-2">
            <button
              type="button"
              data-testid="btn-google-login"
              onClick={onGoogleLogin}
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center space-x-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{isEn ? "Continue with Google" : "Google로 계속하기"}</span>
            </button>

            <button
              type="button"
              data-testid="btn-apple-login"
              onClick={onAppleLogin}
              disabled={isLoading}
              className="w-full h-11 flex items-center justify-center space-x-2.5 rounded-xl bg-black hover:bg-neutral-900 text-white text-xs font-semibold transition-all shadow-2xs"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden>
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.64 1.35-.58.67-.99 1.74-.88 2.76 1.01.08 2.03-.54 2.6-1.26z" />
              </svg>
              <span>{isEn ? "Sign in with Apple" : "Apple로 계속하기"}</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                data-testid="btn-kakao-login"
                onClick={onKakaoLogin}
                disabled={isLoading}
                className="h-10 flex items-center justify-center space-x-1.5 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] text-xs font-semibold transition-all shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>카카오</span>
              </button>
              <button
                type="button"
                data-testid="btn-naver-login"
                onClick={onNaverLogin}
                disabled={isLoading}
                className="h-10 flex items-center justify-center space-x-1.5 rounded-xl bg-[#03C75A] hover:bg-[#02B150] text-white text-xs font-semibold transition-all shadow-2xs"
              >
                <span className="font-extrabold text-xs leading-none font-sans">N</span>
                <span>네이버</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center mb-1">
            <div className="flex items-center justify-center gap-1.5 text-slate-400 mb-0.5">
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center border border-slate-200 text-[8px] font-bold text-slate-600">G</div>
              <div className="w-4 h-4 rounded-full bg-black text-white flex items-center justify-center text-[8px]">🍎</div>
              <div className="w-4 h-4 rounded-full bg-[#FEE500] text-[#191919] flex items-center justify-center text-[8px] font-bold">K</div>
              <div className="w-4 h-4 rounded-full bg-[#03C75A] text-white flex items-center justify-center text-[8px] font-extrabold">N</div>
            </div>
            <p className="text-xs text-slate-400" data-testid="sns-login-disabled-hint">
              {isEn ? "Social login is coming soon" : "간편 로그인은 준비 중입니다"}
            </p>
          </div>
        )}
      </div>

      {/* 4. 메인 이메일 / 비밀번호 폼 */}
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            {targetGroup === 'customer'
              ? (isEn ? "Member Email" : "고객 · 수강생 이메일")
              : currentRole === 'owner'
              ? (isEn ? "Owner Email" : "사업주 · 대표 이메일")
              : (isEn ? "Staff Email" : "직원 · 강사 이메일")}
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
              placeholder={
                targetGroup === 'customer'
                  ? "member@moa.app"
                  : currentRole === 'owner'
                  ? "owner@moa.app"
                  : "staff@moa.app"
              }
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
          className={`w-full mt-2 h-11 min-h-[44px] flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-md disabled:opacity-50 transition-all active:scale-[0.99] cursor-pointer ${
            targetGroup === 'customer'
              ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-500'
              : 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-500'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>로그인 중...</span>
            </>
          ) : (
            <span>
              {targetGroup === 'customer'
                ? '고객 로그인'
                : currentRole === 'owner'
                ? '사업주 로그인'
                : '직원 로그인'}
            </span>
          )}
        </button>
      </form>

      {/* 5. 보조 링크 (직원 초대 코드 입력 / 고객 등록 신청) */}
      <div className="pt-1 text-center">
        {targetGroup === 'workplace' && currentRole === 'staff' && (
          <p className="text-xs text-slate-500">
            초대 코드를 전달받으셨나요?{' '}
            <Link to="/invite/accept" className="font-bold text-indigo-600 hover:underline">
              초대 코드 수락
            </Link>
          </p>
        )}
        {targetGroup === 'customer' && (
          <p className="text-xs text-slate-500">
            아직 매장 회원이 아니신가요?{' '}
            <Link to="/signup/customer" className="font-bold text-emerald-600 hover:underline">
              다니는 매장 등록 신청
            </Link>
          </p>
        )}
      </div>

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
          className="text-xs text-slate-600 hover:text-indigo-600 font-bold inline-flex items-center gap-1 min-h-[36px]"
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
              className={`px-2 py-1 rounded-md transition-all ${
                !isEn ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              KO
            </button>
            <button
              type="button"
              onClick={() => onLanguageChange('en')}
              className={`px-2 py-1 rounded-md transition-all ${
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
