import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Building2,
  UserCheck,
} from "lucide-react";
import { getCoreClient, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/core/auth/AuthProvider";

export const AcceptStaffInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;

  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    if (!token) {
      setErrorMessage("유효한 초대 토큰이 제공되지 않았습니다.");
      setLoading(false);
      return;
    }

    const executeClaim = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        if (!isSupabaseConfigured()) {
          throw new Error("데이터베이스 서비스에 연결할 수 없습니다.");
        }

        const { data, error } = await getCoreClient().rpc("claim_staff_invite", {
          p_token: token,
        });

        if (error) {
          throw new Error(error.message);
        }

        const result = data as any;
        if (result?.success) {
          setSuccess(true);
          setRoleName(result?.role_name || null);
          setTimeout(() => {
            navigate("/workspace");
          }, 2500);
        } else {
          throw new Error("초대 수락에 실패했습니다.");
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "초대 수락 중 오류가 발생했습니다.";
        if (
          msg.includes("expired") ||
          msg.includes("already used") ||
          msg.includes("Token not found")
        ) {
          setErrorMessage(
            "초대 링크가 만료되었거나 이미 사용되었습니다. 관리자에게 재발급을 요청해주세요."
          );
        } else if (msg.includes("Authentication required")) {
          setErrorMessage("로그인이 필요한 작업입니다.");
        } else {
          setErrorMessage(msg);
        }
      } finally {
        setLoading(false);
      }
    };

    executeClaim();
  }, [token, isAuthenticated, user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/70 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-in fade-in duration-200">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 mb-6">
          <UserCheck className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">
          MOA 매장 직원 합류 초대
        </h1>

        {authLoading || loading ? (
          <div className="py-8 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-700">
              초대 정보를 확인하고 권한을 연결하는 중입니다...
            </p>
            <p className="text-xs text-slate-400 mt-1">잠시만 기다려주세요.</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="py-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              매장 직원으로 합류하시려면 계정 로그인이 필요합니다.
              <br />
              로그인 완료 시 배정된 직급 권한이 즉시 적용됩니다.
            </p>
            <button
              onClick={() =>
                navigate(`/login?returnUrl=/invite/staff/${encodeURIComponent(token || "")}`)
              }
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-100"
            >
              <span>로그인하고 초대 수락하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : success ? (
          <div className="py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                직원 합류가 완료되었습니다!
              </h2>
              {roleName && (
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-xs font-bold text-indigo-700">
                  직급: {roleName}
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              매장 워크스페이스로 이동합니다. 잠시 후 자동 전환됩니다.
            </p>
            <button
              onClick={() => navigate("/workspace")}
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition"
            >
              <span>워크스페이스 바로가기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-100 text-rose-600 mb-2">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-bold text-slate-900">초대 처리 실패</h2>
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium text-left">
              {errorMessage || "초대 수락을 완료할 수 없습니다."}
            </div>
            <button
              onClick={() => navigate("/workspace")}
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition"
            >
              <span>홈으로 돌아가기</span>
            </button>
          </div>
        )}

        <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>보안 검증된 1회용 단회성 초대 프로토콜</span>
        </div>
      </div>
    </div>
  );
};
