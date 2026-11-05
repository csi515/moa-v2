import React, { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/core/auth/components/AuthLayout';

/**
 * /invite/accept — 토큰이 없는 직원 초대 진입.
 * 메일·카카오 등으로 받은 초대 코드를 붙여 넣으면 /invite/staff/:token 으로 이동한다.
 */
export const AcceptInviteLandingPage: React.FC = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const raw = token.trim();
    if (!raw) {
      setError('초대 코드를 입력해 주세요.');
      return;
    }
    // URL 전체가 붙여넣어진 경우 토큰만 추출
    const fromPath = raw.match(/\/invite\/staff\/([^/?#]+)/i)?.[1];
    const cleaned = (fromPath || raw).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!cleaned) {
      setError('유효한 초대 코드가 아닙니다.');
      return;
    }
    navigate(`/invite/staff/${encodeURIComponent(cleaned)}`);
  };

  return (
    <AuthLayout mode="login">
      <div className="space-y-5" data-testid="invite-accept-landing">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">직원 초대 수락</h1>
            <p className="text-sm text-slate-500 mt-1">
              사업주가 보낸 초대 링크 또는 초대 코드를 입력해 주세요.
            </p>
            <ol className="mt-3 space-y-1 text-[11px] text-slate-500 list-decimal list-inside text-left">
              <li>초대 코드를 입력하거나 링크를 붙여 넣습니다.</li>
              <li>로그인 후 직급 권한이 연결됩니다.</li>
              <li>워크스페이스에서 배정된 메뉴부터 업무를 시작합니다.</li>
            </ol>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <label className="block space-y-1.5">
            <span className="text-xs font-bold text-slate-700">초대 코드</span>
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="초대 코드 또는 초대 링크 붙여넣기"
              className="w-full px-3 py-3 rounded-xl border border-slate-200 text-sm min-h-[44px]"
              data-testid="invite-token-input"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            data-testid="invite-token-submit"
            className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold min-h-[44px]"
          >
            초대 수락하기
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          <Link to="/login" className="font-bold text-indigo-600 hover:underline">
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
};
