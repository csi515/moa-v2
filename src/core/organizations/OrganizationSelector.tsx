import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  ChevronRight,
  Loader2,
  GraduationCap,
  ArrowLeft,
  UserPlus,
  KeyRound,
} from 'lucide-react';
import { useOrganization } from './OrganizationProvider';
import { getRoleLabel } from './services/organizationService';
import { getIndustryLabel, type IndustryType } from '../industry/types';
import { CreateOrganizationWizard } from './CreateOrganizationWizard';
import { TeacherJoinFlow } from './components/TeacherJoinFlow';
import { useAuth } from '../auth/AuthProvider';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { switchErrorMessage } from './roleContextHelpers';
import { StaffInviteAcceptModal } from '../staff/components/StaffInviteAcceptModal';

export const OrganizationSelector: React.FC = () => {
  const {
    organizations,
    selectOrganization,
    loading,
    organizationsStatus,
    organizationsError,
    refreshOrganizations,
    blockedOwnerOrgIds,
  } = useOrganization();
  const [retrying, setRetrying] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const { signOut, user } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [showTeacherFlow, setShowTeacherFlow] = useState(false);
  const [showStaffInviteAccept, setShowStaffInviteAccept] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const missingEmail = !user?.email?.trim();

  const handleBack = () => {
    // AppGate에 history 스택이 없어 navigate(-1)은 외부로 나갈 수 있음 → 명시적 로그아웃
    setSigningOut(true);
    void signOut().finally(() => setSigningOut(false));
  };

  const handleRetry = () => {
    setRetrying(true);
    void refreshOrganizations().finally(() => setRetrying(false));
  };

  const handleSelectOrganization = async (organizationId: string) => {
    if (selectingId) return;
    setSelectingId(organizationId);
    try {
      await selectOrganization(organizationId);
    } catch (error) {
      showToast(switchErrorMessage(error), 'error', '사업장 선택 실패');
    } finally {
      setSelectingId(null);
    }
  };

  if (loading || signingOut || retrying) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-slate-50"
        data-testid="organization-selector-loading"
      >
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (showTeacherFlow) {
    return <TeacherJoinFlow onBack={() => setShowTeacherFlow(false)} />;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4"
      data-testid="organization-selector"
    >
      <div className="w-full max-w-lg">
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 min-h-[44px] min-w-[44px] px-2 -ml-2 rounded-xl hover:bg-white/80 transition-colors"
            aria-label="뒤로"
          >
            <ArrowLeft className="w-5 h-5" />
            뒤로
          </button>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-lg mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">사업장 선택</h1>
          {organizationsStatus === 'error' ? (
            <div className="mt-3 text-left rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm font-bold text-rose-800">사업장 정보를 불러오지 못했습니다</p>
              <p className="text-xs text-rose-700 mt-1">
                {organizationsError || '잠시 후 다시 시도해 주세요.'}
              </p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-3 min-h-[44px] px-4 rounded-xl bg-rose-700 text-white text-sm font-bold"
              >
                다시 시도
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 mt-2">
              {organizations.length === 0
                ? '등록된 사업장이 없습니다. 새로 등록하거나 기존 사업장에 가입하세요.'
                : '운영·근무할 사업장을 선택하거나 새로 등록하세요. 이용자 가입은 아래 별도 메뉴입니다.'}
            </p>
          )}
          {missingEmail && (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-left leading-relaxed">
              이 계정에 이메일이 없습니다. 알림·계정 복구를 위해 나중에 설정에서 이메일을
              연결해 주세요. 이미 다른 방법으로 가입된 이메일은 자동으로 합쳐지지 않습니다.
            </p>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 sm:p-8 space-y-4">
          {organizations.length > 0 && (
            <>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                내 사업장 ({organizations.length})
              </p>
              <div className="space-y-2">
                {organizations.map((membership) => (
                  <button
                    key={membership.id}
                    type="button"
                    disabled={Boolean(selectingId)}
                    data-testid="organization-option"
                    onClick={() => void handleSelectOrganization(membership.organizationId)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors text-left min-h-[44px] disabled:opacity-60"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">
                          {membership.organization.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getIndustryLabel(membership.organization.industry_type as IndustryType)} ·{' '}
                          {getRoleLabel(
                            membership.role,
                            membership.organization.industry_type as IndustryType
                          )}
                          {membership.role === 'owner' &&
                          blockedOwnerOrgIds.includes(membership.organizationId)
                            ? ' · 운영 중지'
                            : ''}
                        </p>
                      </div>
                    </div>
                    {selectingId === membership.organizationId ? (
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400">또는</span>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setShowWizard(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-indigo-200 rounded-2xl text-indigo-700 font-bold hover:bg-indigo-50 hover:border-indigo-300 transition-colors min-h-[44px]"
          >
            <Plus className="w-5 h-5" />
            새 사업장 등록하기
          </button>

          <button
            type="button"
            onClick={() => navigate('/signup/customer')}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-colors min-h-[44px]"
          >
            <UserPlus className="w-5 h-5" />
            다른 사업장에 이용자로 가입
          </button>

          <button
            type="button"
            onClick={() => setShowStaffInviteAccept(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-emerald-200 rounded-2xl text-emerald-700 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-colors min-h-[44px]"
          >
            <KeyRound className="w-5 h-5" />
            초대 코드로 직원·강사 합류
          </button>

          {organizations.length === 0 && (
            <button
              type="button"
              onClick={() => setShowTeacherFlow(true)}
              className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-emerald-200 rounded-2xl text-emerald-700 font-bold hover:bg-emerald-50 hover:border-emerald-300 transition-colors min-h-[44px]"
            >
              <GraduationCap className="w-5 h-5" />
              기존 사업장에 직원·강사로 가입하기
            </button>
          )}
        </div>
      </div>

      {showStaffInviteAccept && (
        <StaffInviteAcceptModal
          onClose={() => setShowStaffInviteAccept(false)}
          onAccepted={async (result) => {
            setShowStaffInviteAccept(false);
            showToast(`${result.organizationName}에 직원으로 연결되었습니다.`, 'success');
            await refreshOrganizations();
            if (result.organizationId) {
              await handleSelectOrganization(result.organizationId);
            }
          }}
        />
      )}

      {showWizard && (
        <CreateOrganizationWizard
          onComplete={() => setShowWizard(false)}
          onCancel={() => setShowWizard(false)}
        />
      )}
    </div>
  );
};
