import { useState, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserPlus } from 'lucide-react';
import { CustomerMyOrgsView } from './CustomerMyOrgsView';
import { CUSTOMER_MY_ORGS_COPY as COPY } from './customerMyOrgsCopy';
import type { MyLinkedCustomerOrg } from './services/myLinkedCustomerOrgsService';

interface Props {
  organizations: MyLinkedCustomerOrg[];
  email: string;
  canExit: boolean;
  onExit: () => void;
  onSignOut: () => void;
  onRefresh: () => void;
}

/**
 * 수강(enrollment) 없이 Customer 연결만 있는 이용자 셸.
 * (예: Retail 고객 — 사업장 목록 + 포인트 조회)
 */
export const CustomerLinkedOrgsShell: FC<Props> = ({
  organizations,
  email,
  canExit,
  onExit,
  onSignOut,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [pointsActive, setPointsActive] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col pb-safe">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-bold text-indigo-600">MOA</p>
          <h1 className="text-base font-black text-slate-900">
            {pointsActive ? '포인트' : COPY.title}
          </h1>
          {!pointsActive && (
            <p className="text-xs text-slate-500 mt-0.5">{COPY.description}</p>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 space-y-4">
        <CustomerMyOrgsView
          organizations={organizations}
          showHeader={false}
          onPointsActiveChange={setPointsActive}
        />

        {!pointsActive && (
          <>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate('/signup/customer')}
                className="w-full min-h-[48px] rounded-xl bg-indigo-600 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" aria-hidden />
                {COPY.joinCta}
              </button>
              <button
                type="button"
                onClick={onRefresh}
                className="w-full min-h-[44px] rounded-xl border border-indigo-100 text-sm font-bold text-indigo-600"
              >
                {COPY.refresh}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-sm font-bold text-slate-900">계정</p>
              <p className="text-xs text-slate-500">{email || '-'}</p>
              {canExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
                >
                  관리 화면으로
                </button>
              )}
              <button
                type="button"
                onClick={onSignOut}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-bold inline-flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" aria-hidden />
                로그아웃
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
