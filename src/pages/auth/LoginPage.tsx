import React, { useState, useEffect } from "react";
import { useLogin } from "@refinedev/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { MobileLoginForm, type LoginTargetGroup, type WorkplaceRole } from "@/components/auth/MobileLoginForm";
import { useAuth } from "@/core/auth/AuthProvider";
import { isAppsInToss } from "@/core/auth/domain/platformDetector";
import { loginWithToss } from "@/core/auth/services/tossAuthService";
import { mapLoginErrorMessage } from "@/core/auth/utils/mapLoginErrorMessage";
import { appBrand } from "@/core/brand";

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isTossLoading, setIsTossLoading] = useState(false);
  const [language, setLanguage] = useState<'ko' | 'en'>('ko');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginTargetGroup, setLoginTargetGroup] = useState<LoginTargetGroup>('workplace');
  const [workplaceRole, setWorkplaceRole] = useState<WorkplaceRole>('owner');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawReturnUrl = searchParams.get("returnUrl");
  const returnUrl =
    rawReturnUrl && rawReturnUrl.startsWith("/") && !rawReturnUrl.startsWith("//")
      ? rawReturnUrl
      : null;
  const { mutate: login, isPending: isLoading } = useLogin();
  const { signInWithGoogle, signInWithApple, signInWithKakao, signInWithNaver } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      if (signInWithGoogle) {
        await signInWithGoogle();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Google 로그인 연동 실패");
    }
  };

  const handleAppleLogin = async () => {
    try {
      if (signInWithApple) {
        await signInWithApple();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Apple 로그인 연동 실패");
    }
  };

  const handleNaverLogin = async () => {
    try {
      if (signInWithNaver) {
        await signInWithNaver();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "네이버 로그인 연동 실패");
    }
  };

  const handleKakaoLogin = async () => {
    try {
      if (signInWithKakao) {
        await signInWithKakao();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "카카오 로그인 연동 실패");
    }
  };

  const handleTossLogin = async () => {
    setIsTossLoading(true);
    setErrorMessage(null);
    try {
      const result = await loginWithToss();
      if (result.success) {
        // 고객/수강생 역할은 이용권 지갑으로, 사업주/직원 및 통합 권한은 워크스페이스 대시보드로 이동
        if (returnUrl) {
          navigate(returnUrl);
          return;
        }
        const targetPath = result.role === "customer" ? "/customer/pass" : "/workspace";
        navigate(targetPath);
      } else {
        setErrorMessage(
          result.error || "토스 로그인 연동에 실패했습니다. 다시 시도해 주세요."
        );
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "토스 원클릭 로그인 처리 중 오류가 발생했습니다."
      );
    } finally {
      setIsTossLoading(false);
    }
  };

  // 앱스인토스 환경 감지 시: 진입 즉시 토스 원클릭 자동 로그인 프로세스 진행
  useEffect(() => {
    if (isAppsInToss()) {
      void handleTossLogin();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    login(
      { email, password, rememberMe } as any,
      {
        onSuccess: (data: any) => {
          // Refine authProvider는 실패 시에도 resolve({ success: false }) 하므로
          // onError가 아니라 onSuccess에서 success를 반드시 검사한다.
          if (!data?.success) {
            setErrorMessage(mapLoginErrorMessage(data?.error?.message));
            return;
          }
          if (returnUrl) {
            navigate(returnUrl);
            return;
          }
          const defaultTarget = loginTargetGroup === 'customer' ? '/customer/pass' : '/workspace';
          navigate(data?.redirectTo || defaultTarget);
        },
        onError: (error: any) => {
          setErrorMessage(mapLoginErrorMessage(error?.message));
        },
      }
    );
  };

  return (
    <div className="min-h-[100svh] h-dvh w-full flex flex-col lg:flex-row bg-slate-50">
      {/* =========================================================================
          데스크톱 좌측 영역 (lg:flex, w-1/2): 슬레이트 다크톤 전문 SaaS 연출
          ========================================================================= */}
      <div
        data-testid="desktop-brand-panel"
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-12 lg:p-16 flex-col justify-between relative overflow-hidden"
      >
        {/* 장식용 글로우 효과 */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 브랜드 헤더 */}
        <div className="relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold tracking-wider text-indigo-400 uppercase">
                {appBrand.acronym}
              </span>
              <h2 className="text-xl font-extrabold tracking-tight">모아</h2>
            </div>
          </div>

          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>{appBrand.tagline}</span>
          </div>

          {/* 서비스 가치 메인 카피 */}
          <h1 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight mb-4">
            출결, 회원권, 매장 운영을<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-indigo-200 to-blue-200">
              종이 장부 없이 한 손으로
            </span>
          </h1>
          <p className="text-sm xl:text-base text-slate-400 leading-relaxed max-w-lg">
            {appBrand.description}. 출결·회원권·수납을 사업주 화면에서 바로 이어갑니다.
          </p>
        </div>

        {/* 신뢰도 및 핵심 기능 그래픽 카드 */}
        <div className="relative z-10 grid grid-cols-2 gap-4 my-8">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300 mb-2.5">
              <QrCode className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 mb-1">0원 비용 원칙</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              SMS·카카오 알림톡 비용 0원. 2-Way 1회용 W3C QR 프로토콜.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-300 mb-2.5">
              <Zap className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 mb-1">초고속 Realtime 동기화</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              카운터-고객 스마트폰 간 실시간 변경 감지 및 자동 캐시 무효화.
            </p>
          </div>
        </div>

        {/* 보안 인증 뱃지 */}
        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Row Level Security (RLS) 테넌트 격리</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            <span>계정 탈취 방어 내장</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          우측 영역 (w-full lg:w-1/2): 중앙 정렬 로그인 폼 (모바일 단일 카드 뷰 전환)
          ========================================================================= */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-8 lg:p-12">
        <div className="w-full max-w-[420px] lg:max-w-md bg-white rounded-3xl shadow-xl lg:shadow-none border border-slate-100 lg:border-none p-6 sm:p-10">
          {/* 모바일 전용 로고 헤더 (< lg) */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-13 h-13 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 mb-3">
              <Layers className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">모아</h1>
            <p className="text-xs text-slate-500 mt-1">
              {appBrand.description}
            </p>
          </div>

          {/* 데스크톱 우측 타이틀 */}
          <div className="hidden lg:block mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {isAppsInToss() ? "앱스인토스 로그인" : "시스템 로그인"}
            </h2>
            <p className="text-xs text-slate-500 mt-1.5">
              {isAppsInToss()
                ? "토스 앱 계정으로 자동 인증하여 접속합니다."
                : "등록된 사업주/직원 계정 또는 고객 계정으로 접속하세요."}
            </p>
          </div>

          {/* 모바일 최적화 로그인 폼 컴포넌트 */}
          <MobileLoginForm
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onSubmit={handleSubmit}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onGoogleLogin={handleGoogleLogin}
            onAppleLogin={handleAppleLogin}
            onKakaoLogin={handleKakaoLogin}
            onNaverLogin={handleNaverLogin}
            onTossLogin={handleTossLogin}
            isTossLoading={isTossLoading}
            language={language}
            onLanguageChange={setLanguage}
            rememberMe={rememberMe}
            onRememberMeChange={setRememberMe}
            returnUrl={returnUrl ?? undefined}
          />
        </div>
      </div>
    </div>
  );
};
