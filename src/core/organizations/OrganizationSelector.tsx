import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  ChevronRight,
  ChevronDown,
  Loader2,
  GraduationCap,
  LogOut,
  UserPlus,
  KeyRound,
  Sparkles,
  UserRound,
  Compass,
} from 'lucide-react';
import { useOrganization } from './OrganizationProvider';
import { getRoleLabel } from './services/organizationService';
import { getIndustryLabel, type IndustryType } from '../industry/types';
import { CreateOrganizationWizard } from './CreateOrganizationWizard';
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
    canAccessCustomerPortal,
    enterCustomerPortal,
    canAccessParentPortal,
    enterParentPortal,
  } = useOrganization();
  const [retrying, setRetrying] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const { signOut, user } = useAuth();
  const { showToast } = useApp();
  const navigate = useNavigate();
  const [showWizard, setShowWizard] = useState(false);
  const [showStaffInviteAccept, setShowStaffInviteAccept] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const missingEmail = !user?.email?.trim();

  // 기존 소속이 아예 없는 완전 신규 가입자인지 판정
  const isNewUser = organizations.length === 0 && !canAccessCustomerPortal && !canAccessParentPortal;

  const handleSignOut = () => {
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
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="mt-3 text-xs font-semibold text-slate-500">
            {signingOut ? '로그아웃 중...' : '사업장 정보를 불러오는 중...'}
          </p>
        </div>
      </div>
    );
  }

  

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-white to-slate-50 flex items-center justify-center p-4 py-8"
      data-testid="organization-selector"
    >
      <div className="w-full max-w-lg">
        {/* 상단 단정화된 계정 식별 및 로그아웃 바 */}
        <div className="mb-5 flex items-center justify-between bg-white/80 border border-slate-200/80 rounded-2xl p-2 px-3.5 shadow-2xs backdrop-blur-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
              {user?.email?.charAt(0).toUpperCase() || 'M'}
            </div>
            <span className="text-xs text-slate-600 font-medium truncate max-w-[200px] sm:max-w-[260px]" title={user?.email || ''}>
              {user?.email || '로그인 계정'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-xl hover:bg-rose-50/70 transition-colors shrink-0"
            aria-label="로그아웃"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>

        {/* 메인 타이틀 영역 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100 mb-3.5">
            {isNewUser ? <Compass className="w-7 h-7" /> : <Building2 className="w-7 h-7" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isNewUser ? '모아에 오신 것을 환영합니다!' : '사업장 및 포털 선택'}
          </h1>
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
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              {isNewUser
                ? '어떤 목적으로 서비스를 이용하시나요? 시작할 방식을 선택해 주세요.'
                : '접속하실 사업장이나 이용자 포털을 선택해 주세요.'}
            </p>
          )}
          {missingEmail && (
            <p className="mt-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-left leading-relaxed">
              이 계정에 이메일이 등록되지 않았습니다. 알림 및 계정 복구를 위해 설정에서 이메일을 연결해 주세요.
            </p>
          )}
        </div>

        {/* 본문 카드 */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-5 sm:p-7 space-y-4">
          {/* =========================================================================
              CASE A: 신규 가입자 (소속 사업장 0개) — 사업장 vs 고객 2대 경로 선택
              ========================================================================= */}
          {isNewUser ? (
            <div className="space-y-4">
              {/* 1. 사업장으로 시작 (사업주 또는 직원) */}
              <div className="rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/40 p-4 sm:p-5 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900">사업장으로 시작</h3>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold">
                          매장 운영·근무
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        매장을 직접 개설·운영하거나, 직급/강사로 합류합니다
                      </p>
                    </div>
                  </div>
                </div>

                {/* 사업장 내부: 사업주 vs 직원 2분기 */}
                <div className="mt-4 pt-3.5 border-t border-indigo-100/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* 사업주 / 원장님 */}
                  <div className="p-3 bg-white rounded-xl border border-indigo-200/80 hover:border-indigo-400 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">사업주 · 원장님</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">
                        새 매장을 개설하고 출결·회원권·장부를 관리합니다
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-open-create-org-wizard"
                      onClick={() => setShowWizard(true)}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-lg shadow-2xs transition-all min-h-[38px]"
                    >
                      <span>새 매장 개설하기</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* 직원 / 강사 */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-700" />
                        <span className="text-xs font-bold text-slate-900">직원 · 강사</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-normal">
                        사업주에게 받은 초대 코드로 매장에 합류합니다
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="btn-staff-invite-code"
                      onClick={() => setShowStaffInviteAccept(true)}
                      className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white text-xs font-bold rounded-lg shadow-2xs transition-all min-h-[38px]"
                    >
                      <KeyRound className="w-3 h-3 text-slate-300" />
                      <span>초대 코드로 합류</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. 고객으로 시작 (수강생 및 매장 회원) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 transition-all hover:border-emerald-300 hover:bg-emerald-50/20">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-base font-bold text-slate-900">고객으로 시작</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                        수강생 · 회원
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      다니시는 학원이나 매장을 검색하여 회원으로 연결을 신청합니다
                    </p>
                    <button
                      type="button"
                      data-testid="btn-customer-signup"
                      onClick={() => navigate('/signup/customer')}
                      className="mt-3.5 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all min-h-[44px]"
                    >
                      <span>다니는 매장 검색하여 등록 신청</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* =========================================================================
               CASE B: 기존 소속 사업장 또는 포털 이용자 — 즉시 진입 최우선 정돈
               ========================================================================= */
            <div className="space-y-4">
              {/* 고객/학부모 포털 진입 배너 */}
              {canAccessCustomerPortal && (
                <button
                  type="button"
                  onClick={enterCustomerPortal}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-all text-left min-h-[44px] shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-200">
                      <UserRound className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">내 수강권 · 회원권 포털로 이동</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 font-bold">
                          고객 전용
                        </span>
                      </div>
                      <p className="text-xs text-indigo-700 font-medium mt-0.5">
                        등록된 매장의 출석·이용권·예약 현황을 확인합니다
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-indigo-500 shrink-0" />
                </button>
              )}

              {canAccessParentPortal && (
                <button
                  type="button"
                  onClick={enterParentPortal}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300 transition-all text-left min-h-[44px] shadow-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-200">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-bold text-slate-900">학부모 포털로 이동</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold">
                          학부모 전용
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 font-medium mt-0.5">
                        자녀 출결 알림 및 교육 과정을 확인합니다
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-emerald-500 shrink-0" />
                </button>
              )}

              {/* 내 소속 사업장 목록 */}
              {organizations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>운영 · 근무 사업장 ({organizations.length})</span>
                    <span className="text-[11px] font-normal text-slate-400">클릭하여 즉시 접속</span>
                  </p>
                  <div className="space-y-2">
                    {organizations.map((membership) => (
                      <button
                        key={membership.id}
                        type="button"
                        disabled={Boolean(selectingId)}
                        data-testid="organization-option"
                        onClick={() => void handleSelectOrganization(membership.organizationId)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/40 transition-all text-left min-h-[44px] disabled:opacity-60 shadow-2xs hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate text-sm">
                              {membership.organization.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {getIndustryLabel(membership.organization.industry_type as IndustryType)} ·{' '}
                              <span className="font-medium text-slate-700">
                                {getRoleLabel(
                                  membership.role,
                                  membership.organization.industry_type as IndustryType
                                )}
                              </span>
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
                </div>
              )}

              {/* 추가 개설 또는 타 사업장 참여 토글 (화면 복잡도 제어) */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMoreActions((prev) => !prev)}
                  className="w-full flex items-center justify-between py-2.5 px-3 text-xs font-bold text-slate-600 hover:text-indigo-600 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-slate-400" />
                    새 매장 개설 또는 다른 사업장 참여하기
                  </span>
                  {showMoreActions ? (
                    <ChevronDown className="w-4 h-4 rotate-180 transition-transform" />
                  ) : (
                    <ChevronDown className="w-4 h-4 transition-transform" />
                  )}
                </button>

                {showMoreActions && (
                  <div className="mt-3 space-y-2.5 pt-2 border-t border-dashed border-slate-200 animate-in fade-in duration-150">
                    {/* 업종 선택형 새 매장 개설 */}
                    <button
                      type="button"
                      data-testid="btn-open-create-org-wizard"
                      onClick={() => setShowWizard(true)}
                      className="w-full flex items-center justify-between p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 font-bold hover:bg-indigo-100 transition-all text-left min-h-[44px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <div>
                          <p className="text-xs font-bold">새 매장 · 사업장 추가 개설</p>
                          <p className="text-[11px] text-indigo-700/80 font-normal">원하는 업종을 골라 새 사업장을 즉시 등록합니다</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-indigo-500" />
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="btn-customer-signup"
                        onClick={() => navigate('/signup/customer')}
                        className="p-2.5 border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-800">이용자 신청</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">다른 매장 회원 등록</p>
                      </button>

                      <button
                        type="button"
                        data-testid="btn-staff-invite-code"
                        onClick={() => setShowStaffInviteAccept(true)}
                        className="p-2.5 border border-slate-200 rounded-xl text-left hover:bg-slate-50 transition-colors"
                      >
                        <p className="text-xs font-bold text-slate-800">직원 초대 코드</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">초대 코드로 합류</p>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
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
