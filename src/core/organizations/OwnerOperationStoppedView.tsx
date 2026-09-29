import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { useOrganization } from './OrganizationProvider';
import { ownerOperationBlockMessage } from '../auth/services/ownerBusinessGate';

/** 로그인 유지. 휴·폐업 사업장의 운영 화면만 막고 고객 가입은 열어 둔다 */
export const OwnerOperationStoppedView: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const {
    currentOrganization,
    organizations,
    blockedOwnerOrgIds,
    canAccessCustomerPortal,
    canAccessParentPortal,
    enterCustomerPortal,
    enterParentPortal,
    clearOrganization,
  } = useOrganization();
  const [signingOut, setSigningOut] = useState(false);

  const leave = async () => {
    setSigningOut(true);
    try {
      await clearOrganization();
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-100 text-amber-800">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">운영을 열 수 없습니다</h1>
          <p className="text-sm text-slate-600 mt-2">
            {currentOrganization?.name ? `${currentOrganization.name} ` : ''}
            {ownerOperationBlockMessage()} 로그인은 유지됩니다.
          </p>
        </div>

        {organizations.some(
          (m) =>
            (m.role === 'admin' ||
              m.role === 'manager' ||
              m.role === 'staff' ||
              m.role === 'instructor' ||
              (m.role === 'owner' && !blockedOwnerOrgIds.includes(m.organizationId)))
        ) && (
          <button
            type="button"
            onClick={() => void clearOrganization()}
            className="w-full min-h-[44px] rounded-2xl border border-slate-200 font-bold text-slate-700"
          >
            다른 사업장 선택
          </button>
        )}

        {canAccessCustomerPortal && (
          <button
            type="button"
            onClick={enterCustomerPortal}
            className="w-full min-h-[44px] rounded-2xl bg-indigo-600 text-white font-bold"
          >
            내가 다니는 곳으로 이동
          </button>
        )}
        {canAccessParentPortal && (
          <button
            type="button"
            onClick={enterParentPortal}
            className="w-full min-h-[44px] rounded-2xl bg-slate-900 text-white font-bold"
          >
            보호자 화면으로 이동
          </button>
        )}

        <button
          type="button"
          onClick={() => navigate('/signup/customer')}
          className="w-full min-h-[44px] rounded-2xl border border-slate-200 font-bold text-slate-700 inline-flex items-center justify-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          다른 사업장에 이용자로 가입
        </button>

        <button
          type="button"
          onClick={() => void leave()}
          disabled={signingOut}
          className="w-full min-h-[44px] text-sm font-bold text-slate-500"
        >
          {signingOut ? <Loader2 className="w-4 h-4 animate-spin inline" /> : '로그아웃'}
        </button>
      </div>
    </div>
  );
};
