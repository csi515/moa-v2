import React from "react";
import { Mail, Lock, ArrowRight, RefreshCw, MessageSquare, ShieldCheck } from "lucide-react";
import { isAppsInToss } from "@/core/auth/domain/platformDetector";

export interface MobileLoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  onKakaoLogin?: () => void;
  onTossLogin?: () => void;
  isTossLoading?: boolean;
}

export const MobileLoginForm: React.FC<MobileLoginFormProps> = ({
  email,
  setEmail,
  password,
  setPassword,
  onSubmit,
  isLoading,
  errorMessage,
  onKakaoLogin,
  onTossLogin,
  isTossLoading = false,
}) => {
  const inToss = isAppsInToss();

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

            {/* 토스 원클릭 로그인 버튼 (h-12 엄지존 최적화) */}
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
  // 웹 / Cloudflare 환경: 기존 이메일 폼 및 카카오 간편 로그인 정상 노출
  // =========================================================================
  return (
    <div className="w-full space-y-6">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* 이메일 입력 */}
        <div>
          <label
            htmlFor="login-email"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            이메일 계정
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Mail className="w-5 h-5" />
            </div>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@moa.app"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all shadow-xs"
            />
          </div>
        </div>

        {/* 비밀번호 입력 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-semibold text-slate-700"
            >
              비밀번호
            </label>
            <span className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer">
              비밀번호 찾기
            </span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-5 h-5" />
            </div>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all shadow-xs"
            />
          </div>
        </div>

        {/* 에러 피드백 */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* 로그인 제출 버튼 (엄지존 최적화 h-12) */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-100 disabled:opacity-50"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>로그인</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </>
          )}
        </button>
      </form>

      {/* 소셜 및 간편 로그인 분기선 */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-3 text-slate-400">간편 로그인</span>
        </div>
      </div>

      {/* 소셜 로그인 버튼 (h-12) - 토스 환경이 아닐 때만 노출 */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={onKakaoLogin}
          className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] text-sm font-semibold transition-all shadow-xs"
        >
          <MessageSquare className="w-4 h-4 fill-current" />
          <span>카카오로 1초 시작하기</span>
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 pt-2">
        계정이 없으신가요?{" "}
        <span className="font-semibold text-indigo-600 hover:underline cursor-pointer">
          사업장 개설 및 무료 회원가입
        </span>
      </p>
    </div>
  );
};
