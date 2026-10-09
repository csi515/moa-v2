import React from "react";
import { Mail, Lock, ArrowRight, RefreshCw, MessageSquare } from "lucide-react";

export interface MobileLoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  errorMessage?: string | null;
  onKakaoLogin?: () => void;
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
}) => {
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
              placeholder="director@moa.app"
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

      {/* 소셜 로그인 버튼 (h-12) */}
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
