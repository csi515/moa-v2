import React from 'react';
import { useApp } from '@/context/AppContext';
import { StorageService } from '@/services/storage';
import { formatKoreanDateLocal, todayIsoLocal } from '@/shared/utils/localDate';
import { getRoleLabel } from '@/core/organizations/services/organizationService';
import { InlineBusy } from '@/shared/components/ui/Skeleton';
import { RoleContextSwitcher } from '@/core/organizations/RoleContextSwitcher';
import { useOptionalOrganization } from '@/core/organizations/OrganizationProvider';
import { HeaderLocationControl } from '@/core/locations/HeaderLocationControl';
import { useStorageRefresh } from '@/hooks/useStorageRefresh';
import { Layers, Users } from 'lucide-react';

const PORTAL_MODE_LABEL = {
  parent: '학부모 포털',
  customer: '수강생 포털',
} as const;

export const Header: React.FC = () => {
  const { setActiveTab } = useApp();
  const supabaseOrg = useOptionalOrganization();
  const canEnterParentPortal =
    supabaseOrg?.canAccessParentPortal &&
    !supabaseOrg.isParentOnly &&
    !supabaseOrg.parentPortalActive;

  useStorageRefresh('settings');
  const settingsName = StorageService.getSettings().name?.trim();
  const displayName =
    settingsName ||
    supabaseOrg?.currentOrganization?.name ||
    '사업장';

  const todayStr = formatKoreanDateLocal(todayIsoLocal());
  const roleLabel = supabaseOrg?.selectedMembership
    ? getRoleLabel(
        supabaseOrg.selectedMembership.role,
        supabaseOrg.selectedMembership.organization.industry_type
      )
    : '';
  const portalMode = supabaseOrg?.portalMode ?? 'none';
  const portalLabel =
    portalMode === 'parent' || portalMode === 'customer'
      ? PORTAL_MODE_LABEL[portalMode]
      : null;
  const locationLoading = supabaseOrg?.locationsStatus === 'loading';

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 transition-all">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 min-w-0 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="홈으로 이동"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-xs shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                사업장
              </p>
              <h1 className="font-bold text-base sm:text-lg text-indigo-950 tracking-tight truncate hover:text-indigo-700 transition-colors leading-tight">
                {displayName}
              </h1>
              <p className="text-[11px] text-slate-400 font-normal hidden md:block">{todayStr}</p>
            </div>
          </button>

          <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 border-l border-slate-200 pl-2.5 sm:pl-3">
            {supabaseOrg?.currentOrganization && (
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  지점
                </p>
                {locationLoading ? (
                  <InlineBusy label="확인 중" />
                ) : supabaseOrg.locationsStatus === 'error' ? (
                  <p className="text-xs font-semibold text-rose-600">
                    지점을 불러오지 못했습니다
                  </p>
                ) : (
                  <HeaderLocationControl />
                )}
              </div>
            )}
            {roleLabel && (
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  역할
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-slate-700 truncate">
                  {roleLabel}
                </p>
              </div>
            )}
            {portalLabel && (
              <span className="self-start sm:self-center text-[10px] font-bold px-2 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200">
                {portalLabel}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {canEnterParentPortal && (
            <button
              type="button"
              onClick={() => supabaseOrg?.enterParentPortal()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 min-h-[44px]"
            >
              <Users className="w-4 h-4" />
              학부모 포털
            </button>
          )}
          <RoleContextSwitcher />
        </div>
      </div>
    </header>
  );
};
