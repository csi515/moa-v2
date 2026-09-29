import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import type { CustomerJoinRequest } from '@/types';
import { customerJoinService } from './services/customerJoinService';

function getStatusLabel(status: string): { label: string; color: string } {
  const labels: Record<string, { label: string; color: string }> = {
    pending: { label: '승인 대기', color: 'bg-yellow-100 text-yellow-700' },
    approved: { label: '승인 완료', color: 'bg-green-100 text-green-700' },
    rejected: { label: '반려됨', color: 'bg-red-100 text-red-700' },
    cancelled: { label: '취소됨', color: 'bg-slate-100 text-slate-700' },
  };
  return labels[status] || { label: status, color: 'bg-slate-100 text-slate-700' };
}

interface Props {
  joinRequests: CustomerJoinRequest[];
  onReload: () => Promise<void>;
  onSignOut: () => void;
}

/** 수강·Customer 연결 모두 없을 때 — 가입 신청 안내 */
export const CustomerNoLinkEmptyState: FC<Props> = ({
  joinRequests,
  onReload,
  onSignOut,
}) => {
  const navigate = useNavigate();
  const pending = joinRequests.filter((r) => r.status === 'pending');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-slate-50 pb-safe">
      <UserRound className="w-10 h-10 text-slate-300" />
      <div>
        <h1 className="text-lg font-black text-slate-900">연결된 수강 정보가 없습니다</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
          가입 신청이 승인되면 여기에서 출석·이용권·연습실을 확인할 수 있습니다.
        </p>
      </div>

      {pending.length > 0 && (
        <div className="w-full max-w-sm space-y-2 text-left">
          <p className="text-xs font-bold text-slate-600">승인 대기 중</p>
          {pending.map((r) => {
            const status = getStatusLabel(r.status);
            return (
              <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {r.organization_name || r.applicant_name}
                  </p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  신청일 {new Date(r.created_at).toLocaleDateString('ko-KR')}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm('이 가입 신청을 취소할까요?')) return;
                    try {
                      await customerJoinService.cancelMyJoinRequest(r.id);
                      await onReload();
                    } catch (err) {
                      alert(err instanceof Error ? err.message : '취소에 실패했습니다');
                    }
                  }}
                  className="mt-2 w-full py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl min-h-[44px]"
                >
                  신청 취소
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-2 w-full max-w-sm">
        <button
          type="button"
          onClick={() =>
            navigate('/signup/customer', { state: { openPending: pending.length > 0 } })
          }
          className="w-full px-4 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl min-h-[44px]"
        >
          {pending.length > 0 ? '신청 현황·추가 신청' : '사업장 가입 신청하기'}
        </button>
        <button
          type="button"
          onClick={() => void onReload()}
          className="w-full px-4 py-2.5 text-sm font-bold text-indigo-600 border border-indigo-100 rounded-xl min-h-[44px]"
        >
          승인 여부 새로고침
        </button>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full px-4 py-2.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl min-h-[44px]"
        >
          로그아웃
        </button>
      </div>
    </div>
  );
};
