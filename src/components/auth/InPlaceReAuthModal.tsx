import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession, signIn } from '@/core/auth/services/authService';
import { requestSignOut } from '@/core/auth/services/signOutCoordinator';
import { showToast } from '@/shared/feedback/uiFeedback';
import {
  closeReAuthModal,
  discardPendingRequests,
  replayPendingRequests,
  subscribeReAuth,
} from '@/providers/authInterceptor';

export function InPlaceReAuthModal() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [secret, setSecret] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => subscribeReAuth(setOpen), []);

  if (!open) return null;

  async function extendSession() {
    setBusy(true);
    try {
      const session = await getSession();
      const email = session?.user.email;
      if (!email) throw new Error('로그인 계정을 찾지 못했습니다.');
      await signIn({ email, password: secret });
      await replayPendingRequests();
      setSecret('');
      closeReAuthModal();
      showToast('세션이 안전하게 연장되었습니다', 'success');
    } catch (error) {
      showToast.error(error, '다시 인증하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
      <form
        className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          void extendSession();
        }}
      >
        <h2 className="text-lg font-bold">세션 연장</h2>
        <p className="mt-2 text-sm text-slate-600">
          보안을 위해 세션이 만료되었습니다. 작성 중인 내용을 유지하려면 비밀번호(또는 관리자 PIN)를 입력하세요.
        </p>
        <input
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          className="mt-4 min-h-12 w-full rounded-xl border px-3"
        />
        <button type="submit" disabled={busy || secret.length < 4} className="mt-3 min-h-12 w-full rounded-xl bg-slate-900 text-sm font-bold text-white">
          세션 연장
        </button>
        <button
          type="button"
          className="mt-2 min-h-12 w-full text-sm text-slate-500"
          onClick={() => {
            discardPendingRequests();
            closeReAuthModal();
            void requestSignOut({ force: true }).finally(() => navigate('/login'));
          }}
        >
          로그아웃하고 나가기
        </button>
      </form>
    </div>
  );
}
