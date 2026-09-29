import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  LogOut,
  CheckCircle2,
  Users,
  Briefcase,
  GraduationCap,
  UserRound,
  UserPlus,
  Loader2,
  MapPin,
} from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { useOptionalAuth } from '../auth/AuthProvider';
import { useOptionalOrganization } from './OrganizationProvider';
import { getRoleLabel } from './services/organizationService';
import type { MemberRole } from '@/lib/supabase';
import { StorageService } from '@/services/storage';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { LOCATION_SCOPE_LABELS } from '@/core/locations/locationLabels';
import { focusInitialElement, handleMenuKeydown } from '@/shared/components/ui/modalFocus';
import {
  isManagerLikeRole,
  isStaffLikeRole,
  roleSectionLabel,
  switchErrorMessage,
} from './roleContextHelpers';

interface MembershipGroup {
  organizationId: string;
  organizationName: string;
  memberships: Array<{
    id: string;
    role: MemberRole;
    organizationId: string;
    isCurrentContext: boolean;
  }>;
}

/** 업무 컨텍스트(사업장·역할·지점)와 계정 기능을 구분한 메뉴 */
export const RoleContextSwitcher: React.FC = () => {
  const auth = useOptionalAuth();
  const org = useOptionalOrganization();
  const navigate = useNavigate();
  const { currentUser, setActiveTab, showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const menu = menuRef.current;
    if (menu) focusInitialElement(menu);
  }, [open]);

  const memberships = org?.memberships ?? [];
  const selectedMembership = org?.selectedMembership;
  useStorageRefresh('settings');
  const settingsName = StorageService.getSettings().name?.trim();
  const currentOrgId = selectedMembership?.organizationId;

  const groupedMemberships = useMemo(() => {
    const groups = new Map<string, MembershipGroup>();

    memberships.forEach((membership) => {
      const orgId = membership.organizationId;
      if (!groups.has(orgId)) {
        const isCurrent = orgId === currentOrgId;
        groups.set(orgId, {
          organizationId: orgId,
          organizationName:
            isCurrent && settingsName ? settingsName : membership.organization.name,
          memberships: [],
        });
      }
      groups.get(orgId)!.memberships.push({
        id: membership.id,
        role: membership.role,
        organizationId: membership.organizationId,
        isCurrentContext: membership.isCurrentContext ?? false,
      });
    });

    return Array.from(groups.values());
  }, [memberships, currentOrgId, settingsName]);

  if (!auth || !org || memberships.length === 0) return null;

  const {
    switchMembership,
    clearOrganization,
    enterParentPortal,
    canAccessParentPortal,
    enterCustomerPortal,
    canAccessCustomerPortal,
    selectLocation,
    locations,
    currentLocation,
    locationLabel,
    canChangeLocation,
    canClearLocation,
    portalMode,
  } = org;

  const currentOrgName = settingsName || selectedMembership?.organization.name || '';
  const currentRoleLabel = selectedMembership
    ? getRoleLabel(
        selectedMembership.role,
        selectedMembership.organization.industry_type
      )
    : '';
  const displayName = currentUser.name?.trim() || auth.user?.email || '사용자';

  const handleSwitchMembership = async (membershipId: string) => {
    if (switchingId) return;
    if (selectedMembership?.id === membershipId) {
      closeMenu();
      return;
    }
    setSwitchingId(membershipId);
    try {
      await switchMembership(membershipId);
      closeMenu();
    } catch (error) {
      showToast(switchErrorMessage(error), 'error', '전환 실패');
    } finally {
      setSwitchingId(null);
    }
  };

  const handleLogout = async () => {
    if (switchingId) return;
    closeMenu();
    await auth.signOut();
  };

  const getRoleIcon = (role: MemberRole) => {
    if (isManagerLikeRole(role)) return <Briefcase className="w-3.5 h-3.5" />;
    if (isStaffLikeRole(role)) return <GraduationCap className="w-3.5 h-3.5" />;
    return <Users className="w-3.5 h-3.5" />;
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? closeMenu() : setOpen(true))}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="role-context-menu"
        aria-label={`역할: ${currentRoleLabel || '선택'}`}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 min-h-[44px] rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer text-left max-w-[180px] sm:max-w-none"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Briefcase className="w-4 h-4" />
        </div>
        <div className="hidden sm:block min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">전환</p>
          <p className="text-xs font-bold text-indigo-950 leading-tight truncate">
            {currentRoleLabel || '역할'}
          </p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={closeMenu} aria-hidden />
          <div
            ref={menuRef}
            id="role-context-menu"
            role="menu"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (!menuRef.current) return;
              handleMenuKeydown(event.nativeEvent, menuRef.current, closeMenu);
            }}
            className="fixed left-4 right-4 bottom-20 sm:absolute sm:left-auto sm:right-0 sm:bottom-auto sm:mt-2 sm:w-80 max-h-[70vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50"
          >
            <p className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
              업무 환경
            </p>
            <div className="px-3 py-2.5 mb-1 rounded-xl bg-teal-50/80 border border-teal-100 space-y-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">사업장</p>
                <p className="text-sm font-bold text-slate-900 truncate">{currentOrgName || '사업장'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">지점</p>
                <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-teal-600" />
                  {locationLabel}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">역할</p>
                <p className="text-[11px] font-semibold text-slate-700">{currentRoleLabel || '-'}</p>
              </div>
              {portalMode !== 'none' && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">모드</p>
                  <p className="text-[11px] font-semibold text-violet-800">
                    {portalMode === 'parent' ? '학부모 포털' : '수강생 포털'}
                  </p>
                </div>
              )}
            </div>

            {canChangeLocation && (
              <div className="mb-2 px-1">
                <p className="text-[11px] font-bold text-slate-400 px-2 py-1">지점 전환</p>
                {canClearLocation && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={Boolean(switchingId)}
                    onClick={() => selectLocation(null)}
                    className={`w-full text-left px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold ${
                      !currentLocation ? 'bg-teal-50 text-teal-900' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {LOCATION_SCOPE_LABELS.all}
                  </button>
                )}
                {locations.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    role="menuitem"
                    disabled={Boolean(switchingId)}
                    onClick={() => selectLocation(row.id)}
                    className={`w-full text-left px-3 py-2 min-h-[44px] rounded-xl text-xs font-semibold ${
                      currentLocation?.id === row.id
                        ? 'bg-teal-50 text-teal-900'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {row.name}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[11px] font-bold text-slate-400 px-3 py-1.5 uppercase tracking-wider">
              사업장 / 역할 전환
            </p>

            {groupedMemberships.map((group) => (
              <div key={group.organizationId} className="mb-2">
                <p className="text-[11px] font-bold text-slate-600 px-3 py-1">
                  {group.organizationName}
                </p>
                <div className="space-y-1">
                  {group.memberships.map((membership) => {
                    const isSelected = selectedMembership?.id === membership.id;
                    const fullMembership = memberships.find((m) => m.id === membership.id);
                    const roleLabel = getRoleLabel(
                      membership.role,
                      fullMembership?.organization.industry_type
                    );
                    const busy = switchingId === membership.id;
                    return (
                      <button
                        key={membership.id}
                        type="button"
                        role="menuitem"
                        disabled={Boolean(switchingId)}
                        onClick={() => void handleSwitchMembership(membership.id)}
                        className={`w-full text-left p-2.5 rounded-xl flex items-center justify-between text-xs transition-colors min-h-[44px] disabled:opacity-60 ${
                          isSelected
                            ? 'bg-indigo-50 text-indigo-900 font-bold border border-indigo-200'
                            : 'hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : getRoleIcon(membership.role)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate">{roleLabel}</p>
                            <p className="text-[10px] text-slate-500">{roleSectionLabel(membership.role)}</p>
                          </div>
                        </div>
                        {isSelected && !busy && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              role="menuitem"
              disabled={Boolean(switchingId)}
              onClick={() => {
                clearOrganization();
                closeMenu();
              }}
              className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 min-h-[44px]"
            >
              <Building2 className="w-4 h-4 shrink-0" />
              사업장 추가/선택
            </button>

            {(canAccessParentPortal || canAccessCustomerPortal) && (
              <div className="border-t border-slate-100 mt-2 pt-2">
                <p className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                  보기 전환
                </p>
                {canAccessParentPortal && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={Boolean(switchingId)}
                    onClick={() => {
                      enterParentPortal();
                      closeMenu();
                    }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 min-h-[44px]"
                  >
                    <Users className="w-4 h-4" />
                    학부모 포털
                  </button>
                )}
                {canAccessCustomerPortal && (
                  <button
                    type="button"
                    role="menuitem"
                    disabled={Boolean(switchingId)}
                    onClick={() => {
                      enterCustomerPortal();
                      closeMenu();
                    }}
                    className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 min-h-[44px]"
                  >
                    <UserRound className="w-4 h-4" />
                    이용자 포털
                  </button>
                )}
              </div>
            )}

            <div className="border-t border-slate-100 mt-2 pt-2 space-y-1">
              <p className="text-[11px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                계정
              </p>
              <div className="px-3 py-2 mb-1 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                {auth.user?.email && (
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{auth.user.email}</p>
                )}
              </div>
              <button
                type="button"
                role="menuitem"
                disabled={Boolean(switchingId)}
                onClick={() => {
                  closeMenu();
                  navigate('/signup/customer');
                }}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-indigo-600 hover:bg-indigo-50 min-h-[44px]"
              >
                <UserPlus className="w-4 h-4 shrink-0" />
                다른 사업장에 이용 신청
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={Boolean(switchingId)}
                onClick={() => {
                  setActiveTab('account');
                  closeMenu();
                }}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 min-h-[44px]"
              >
                <UserRound className="w-4 h-4" />
                내 계정
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={Boolean(switchingId)}
                onClick={() => void handleLogout()}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 min-h-[44px]"
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
