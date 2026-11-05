import React, { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { getCoreClient } from '@/lib/supabase';
import { AuthLayout } from '@/core/auth/components/AuthLayout';

/**
 * 비밀번호 재설정 메일 링크 랜딩.
 * Supabase detectSessionInUrl 이 recovery 세션을 만든 뒤 새 비밀번호를 저장한다.
 */
export const RecoveryPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const client = getCoreClient();

    const bootstrap = async () => {
      const { data } = await client.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady(true);
        setChecking(false);
        return;
      }
      // URL 해시 처리가 끝날 때까지 짧게 대기
      await new Promise((r) => setTimeout(r, 800));
      if (cancelled) return;
      const again = await client.auth.getSession();
      if (cancelled) return;
      setReady(!!again.data.session);
      setChecking(false);
    };

    void bootstrap();

    const { data: sub } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setReady(true);
        setChecking(false);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }
    if (password !== confirm) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await getCoreClient().auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '비밀번호 변경에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout mode="forgot">
      <div className="space-y-5" data-testid="recovery-password-page">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">새 비밀번호 설정</h1>
          <p className="text-sm text-slate-500 mt-1">
            이메일로 받은 링크를 통해 접속하셨습니다. 새 비밀번호를 입력해 주세요.
          </p>
        </div>

        {checking && (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> 재설정 세션을 확인하는 중...
          </p>
        )}

        {!checking && !ready && !done && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-3">
            <p>재설정 링크가 만료되었거나 유효하지 않습니다. 비밀번호 찾기를 다시 요청해 주세요.</p>
            <Link
              to="/signup?mode=forgot"
              className="inline-flex font-bold text-indigo-600 hover:underline min-h-[44px] items-center"
            >
              비밀번호 찾기 다시하기
            </Link>
          </div>
        )}

        {done && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 font-semibold">
            비밀번호가 변경되었습니다. 로그인 화면으로 이동합니다.
          </div>
        )}

        {!checking && ready && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                data-testid="recovery-error"
              >
                {error}
              </div>
            )}
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700">새 비밀번호</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 text-sm min-h-[44px]"
                  data-testid="recovery-password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 min-w-[44px] min-h-[44px]"
                  aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-bold text-slate-700">비밀번호 확인</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm min-h-[44px]"
                data-testid="recovery-password-confirm"
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              data-testid="recovery-submit"
              className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold min-h-[44px] disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> 저장 중...
                </span>
              ) : (
                '비밀번호 변경'
              )}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-slate-500">
          <Link to="/login" className="font-bold text-indigo-600 hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
