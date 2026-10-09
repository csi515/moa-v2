import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, ShieldCheck } from 'lucide-react';
import { getCoreClient, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/core/auth/AuthProvider';

export const ClaimTokenPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user;

  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    if (!token) {
      setErrorMessage('유효한 토큰이 제공되지 않았습니다.');
      setLoading(false);
      return;
    }

    const executeClaim = async () => {
      setLoading(true);
      setErrorMessage(null);

      try {
        if (!isSupabaseConfigured()) {
          throw new Error('데이터베이스 서비스에 연결할 수 없습니다.');
        }

        const { data, error } = await getCoreClient().rpc('claim_store_token', {
          p_token: token,
        });

        if (error) {
          throw new Error(error.message);
        }

        if ((data as any)?.success) {
          setSuccess(true);
          setTimeout(() => {
            navigate('/customer/pass');
          }, 2000);
        } else {
          throw new Error('토큰 클레임에 실패했습니다.');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '토큰 등록 중 오류가 발생했습니다.';
        if (msg.includes('hijack')) {
          setErrorMessage('해당 고객은 이미 다른 계정과 바인딩되어 있습니다 (계정 탈취 방어).');
        } else if (msg.includes('expired') || msg.includes('Invalid')) {
          setErrorMessage('토큰이 만료되었거나 이미 사용되었습니다. 매장에 재발급을 요청해주세요.');
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-in fade-in duration-200">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-lg mb-6">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">MOA 멤버십 원터치 연결</h1>

        {authLoading || loading ? (
          <div className="py-8 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm text-slate-500">본인 계정과 안전하게 연결하는 중입니다...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="py-6 space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              본인 계정으로 로그인하시면<br />
              매장 멤버십 및 수강권이 즉시 안전하게 연결됩니다.
            </p>
            <button
              onClick={() => navigate(`/login?returnUrl=/claim/${token}`)}
              className="w-full h-12 flex items-center justify-center space-x-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition shadow-md shadow-indigo-100"
            >
              <span>로그인하고 계속하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : success ? (
          <div className="py-8 flex flex-col items-center animate-in zoom-in-95 duration-200">
            <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-3" />
            <h2 className="text-lg font-bold text-slate-900">연결이 완료되었습니다!</h2>
            <p className="text-xs text-slate-500 mt-1">잠시 후 내 수강권 화면으로 이동합니다...</p>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="flex items-center justify-center space-x-2 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <span className="font-semibold text-sm">연결 실패</span>
            </div>
            <p className="text-xs text-slate-600 bg-rose-50 border border-rose-200 rounded-xl p-3 text-left">
              {errorMessage || '알 수 없는 오류가 발생했습니다.'}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-12 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold transition"
            >
              홈으로 이동
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
