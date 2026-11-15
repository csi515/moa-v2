import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  getSession,
  signIn,
  refreshSession,
  getUserProvider,
  signInWithKakao,
  signInWithGoogle,
  signInWithNaver,
  signInWithApple,
} from '@/core/auth/services/authService';
import { requestSignOut } from '@/core/auth/services/signOutCoordinator';
import { showToast } from '@/shared/feedback/uiFeedback';
import { Modal } from '@/shared/components/ui/Modal';
import {
  closeReAuthModal,
  discardPendingRequests,
  replayPendingRequests,
  subscribeReAuth,
} from '@/providers/authInterceptor';

const PROVIDER_NAMES: Record<string, string> = {
  kakao: '카카오',
  google: '구글',
  'custom:naver': '네이버',
  naver: '네이버',
  apple: '애플',
  email: '이메일',
};

export function InPlaceReAuthModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [provider, setProvider] = useState<string>('email');
  const [userEmail, setUserEmail] = useState<string>('');

  const initSessionInfo = useCallback(async () => {
    try {
      const session = await getSession();
      if (session?.user) {
        setUserEmail(session.user.email ?? '');
        setProvider(getUserProvider(session.user));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeReAuth((isOpen) => {
      setOpen(isOpen);
      if (isOpen) {
        void initSessionInfo();
      }
    });
    return unsubscribe;
  }, [initSessionInfo]);

  if (!open) return null;

  const isSocialUser = provider !== 'email';
  const providerLabel = PROVIDER_NAMES[provider] || provider;

  /** 세션 토큰 갱신 시도 */
  async function handleRefreshSession() {
    setBusy(true);
    try {
      const session = await refreshSession();
      if (!session) throw new Error('세션을 갱신할 수 없습니다.');
      const count = await replayPendingRequests();
      closeReAuthModal();
      showToast(
        count > 0
          ? `세션이 갱신되었습니다. 대기 중이던 ${count}건의 요청을 완료했습니다.`
          : '세션이 안전하게 갱신되었습니다.',
        'success'
      );
    } catch (error) {
      showToast.error(error, '세션 갱신에 실패했습니다. 비밀번호 입력 또는 다시 로그인이 필요합니다.');
    } finally {
      setBusy(false);
    }
  }

  /** 이메일/비밀번호 재인증 */
  async function handlePasswordExtend() {
    setBusy(true);
    try {
      const email = userEmail || (await getSession())?.user.email;
      if (!email) throw new Error('로그인 계정을 찾지 못했습니다.');
      await signIn({ email, password: secret });
      const count = await replayPendingRequests();
      setSecret('');
      closeReAuthModal();
      showToast(
        count > 0
          ? `세션이 연장되었습니다. 대기 중이던 ${count}건의 요청을 완료했습니다.`
          : '세션이 안전하게 연장되었습니다.',
        'success'
      );
    } catch (error) {
      showToast.error(error, '다시 인증하지 못했습니다. 비밀번호를 확인해 주세요.');
    } finally {
      setBusy(false);
    }
  }

  /** 소셜 재인증 트리거 */
  async function handleSocialReAuth() {
    setBusy(true);
    try {
      if (provider === 'kakao') {
        await signInWithKakao();
      } else if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'custom:naver' || provider === 'naver') {
        await signInWithNaver();
      } else if (provider === 'apple') {
        await signInWithApple();
      } else {
        await handleRefreshSession();
      }
    } catch (error) {
      showToast.error(error, `${providerLabel} 재인증에 실패했습니다.`);
      setBusy(false);
    }
  }

  function handleLogout() {
    if (window.confirm('작성 중인 작업 내용이 저장되지 않을 수 있습니다. 로그아웃하시겠습니까?')) {
      discardPendingRequests();
      closeReAuthModal();
      void requestSignOut({ force: true }).finally(() => navigate('/login'));
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleLogout}
      title="세션 만료 안내"
      description="안전한 보안 유지를 위해 로그인 인증이 만료되었습니다."
      maxWidth="md"
      footer={
        <div className="flex w-full items-center justify-between pt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px]">
            <AlertTriangle className="h-3 w-3 text-amber-500" />
            작업 중단 시에만 로그아웃하세요
          </span>
          <button
            type="button"
            className="text-slate-500 hover:text-rose-600 font-medium py-1 px-2 rounded transition-colors"
            onClick={handleLogout}
          >
            로그아웃하고 나가기
          </button>
        </div>
      }
    >
      <div>
        {/* 보존 알림 배지 */}
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 mb-4 border border-emerald-100">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>작성 중인 화면과 입력 데이터는 안전하게 보존 중입니다.</span>
        </div>

        {isSocialUser ? (
          /* 소셜 로그인 사용자 UI */
          <div className="space-y-3">
            <div className="rounded-xl bg-slate-50 p-4 border border-slate-100">
              <p className="text-xs text-slate-600 leading-relaxed">
                현재 <strong className="font-semibold text-slate-900">{providerLabel} 소셜 계정</strong>
                {userEmail ? `(${userEmail})` : ''}으로 접속 중입니다.
                비밀번호 없이 세션을 즉시 새로고침할 수 있습니다.
              </p>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleRefreshSession()}
              className="flex items-center justify-center gap-2 min-h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-bold text-white transition-colors disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              세션 즉시 새로고침
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSocialReAuth()}
              className="min-h-11 w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
            >
              {providerLabel} 계정으로 다시 인증하기
            </button>
          </div>
        ) : (
          /* 이메일/비밀번호 사용자 UI */
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void handlePasswordExtend();
            }}
          >
            <p className="text-xs text-slate-600">
              {userEmail ? (
                <span className="font-semibold text-slate-900">{userEmail}</span>
              ) : (
                '계정'
              )}
              의 비밀번호를 입력하면 현재 작업을 중단 없이 계속할 수 있습니다.
            </p>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="비밀번호 입력"
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              className="mt-3 min-h-12 w-full rounded-xl border border-slate-200 px-3.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              autoFocus
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRefreshSession()}
                className="flex items-center justify-center gap-1.5 min-h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
                title="저장된 토큰으로 즉시 갱신 시도"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                토큰 갱신
              </button>
              <button
                type="submit"
                disabled={busy || secret.length < 4}
                className="flex-1 flex items-center justify-center gap-2 min-h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-bold text-white transition-colors disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                세션 연장하기
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
