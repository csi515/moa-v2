import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingScreen } from '@/shared/components/LoadingScreen';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { StorageService } from '@/services/storage';
import { canAccessRndPortal, normalizeRolePermissions } from '@/domain/permissions';
import { AccessDeniedBanner } from '@/pages/settings/DynamicRoleSettingsPage';
import { isRndTabEnabled, resolveRndEnabledCapabilities, type RndTab } from './rndPortalCapabilities';

const ResearchProjectManagementView = lazy(() =>
  import('@/capabilities/research_project').then((m) => ({ default: m.ResearchProjectManagementView })),
);
const PatentAssetManagementView = lazy(() =>
  import('@/capabilities/patent_ip_asset').then((m) => ({ default: m.PatentAssetManagementView })),
);
import { RndEquipmentPortalSection } from './RndEquipmentPortalSection';

const TAB_LABEL: Record<RndTab, string> = {
  projects: '연구 프로젝트',
  equipment: '연구 장비·예약',
  patents: '특허 관리',
};

export const RndPortalPage: React.FC = () => {
  const { currentOrganization, activeCapabilities } = useOrganization();
  const settings = (currentOrganization?.settings ?? null) as Record<string, unknown> | null;
  const activeUser = StorageService.getActiveUser();
  const hasPortalAccess = canAccessRndPortal({
    role: activeUser?.role ?? null,
    permissions: normalizeRolePermissions(activeUser?.customRole?.permissions ?? null) ?? undefined,
    customRole: activeUser?.customRole ?? null,
  });

  const enabledCaps = useMemo(
    () =>
      resolveRndEnabledCapabilities(
        currentOrganization?.industry_type,
        settings,
        activeCapabilities ?? [],
      ),
    [currentOrganization?.industry_type, settings, activeCapabilities],
  );

  const visibleTabs = useMemo(
    () => (Object.keys(TAB_LABEL) as RndTab[]).filter((id) => isRndTabEnabled(id, enabledCaps)),
    [enabledCaps],
  );

  const [tab, setTab] = useState<RndTab>('projects');

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.includes(tab)) setTab(visibleTabs[0]);
  }, [visibleTabs, tab]);

  if (!hasPortalAccess) {
    return (
      <main className="mx-auto max-w-lg p-6">
        <AccessDeniedBanner />
        <p className="mt-3 text-center text-sm text-slate-600">
          연구소 포털은 권한이 부여된 담당자만 이용할 수 있습니다.
        </p>
        <Link to="/workspace/intranet" className="mt-4 block text-center text-sm font-medium text-slate-800">
          사내 업무 허브로 이동
        </Link>
      </main>
    );
  }

  if (visibleTabs.length === 0) {
    return (
      <main className="mx-auto max-w-lg p-6 text-center">
        <p className="text-sm text-slate-600">연구소 포털 모듈이 활성화되지 않았습니다.</p>
        <Link to="/workspace/intranet" className="mt-4 inline-block text-sm font-medium text-slate-800">
          사내 업무 허브로 이동
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] bg-slate-50">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
        <div className="mb-2">
          <Link
            to="/workspace/intranet"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>사내 앱 런처로 돌아가기</span>
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">연구소 통합 포털</h1>
          {enabledCaps.includes('approval_workflow') ? (
            <Link
              to="/workspace/approvals"
              className="ml-auto min-h-11 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            >
              전자 결재
            </Link>
          ) : null}
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {visibleTabs.map((id) => (
            <button
              key={id}
              type="button"
              className={`min-h-12 shrink-0 rounded-xl px-4 text-sm font-medium ${
                tab === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
              onClick={() => setTab(id)}
            >
              {TAB_LABEL[id]}
            </button>
          ))}
        </div>
      </div>
      <Suspense fallback={<LoadingScreen message="연구소 화면 로딩…" />}>
        {tab === 'projects' ? <ResearchProjectManagementView /> : null}
        {tab === 'equipment' ? <RndEquipmentPortalSection /> : null}
        {tab === 'patents' ? <PatentAssetManagementView /> : null}
      </Suspense>
    </main>
  );
};
