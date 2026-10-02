import { type FC, type ReactNode, useMemo } from 'react';
import { Construction, Home, Settings, User } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import { ModuleLabelsProvider } from '@/core/labels';
import { WorkplaceSettingsView } from '@/core/organizations/components/WorkplaceSettingsView';
import { accountViewEntry } from '@/core/industry/commonViewEntries';
import { ToastContainer, ConfirmDialog } from '@/shared/components';
import { EmptyState } from '@/shared/components/ui';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { ModuleSidebar } from '@/shared/components/layout/ModuleSidebar';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getIndustryLabel, shouldUseGenericShell } from '@/core/industry/types';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { filterNavSections } from '@/core/auth/navUtils';

export { shouldUseGenericShell };

const GENERIC_NAV_SECTIONS: NavMenuSection[] = [
  {
    title: '메뉴',
    items: [
      { tab: 'dashboard', label: '홈', icon: <Home className="w-4 h-4" /> },
      { tab: 'settings', label: '설정', icon: <Settings className="w-4 h-4" /> },
      { tab: 'account', label: '내 계정', icon: <User className="w-4 h-4" /> },
    ],
  },
];

const GENERIC_MAIN_TABS: NavMenuItem[] = GENERIC_NAV_SECTIONS[0].items;

const GENERIC_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <GenericHomeView />,
  settings: () => <WorkplaceSettingsView />,
  ...accountViewEntry,
};

function GenericHomeView() {
  const { currentOrganization } = useOrganization();
  const label = getIndustryLabel(currentOrganization?.industry_type);

  return (
    <div className="max-w-lg mx-auto pt-4 sm:pt-8" data-testid="director-home">
      <EmptyState
        icon={<Construction className="w-12 h-12" />}
        title={`${label} 전용 기능 준비 중`}
        description="설정과 계정 메뉴는 바로 사용할 수 있습니다. 업종별 업무 기능은 순차적으로 제공됩니다."
      />
    </div>
  );
}

/** 모듈 미개발 업종용 공통 셸 (설정·계정 + 준비 중 안내) */
export const GenericIndustryShell: FC = () => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const { allowedTabs, roleLabel, roleBadge } = usePermissions();
  const filteredSections = useMemo(
    () => filterNavSections(GENERIC_NAV_SECTIONS, allowedTabs),
    [allowedTabs]
  );

  useTabGuard();

  const renderView = GENERIC_VIEW_MAP[activeTab] ?? GENERIC_VIEW_MAP.dashboard;

  return (
    <ModuleLabelsProvider>
      <ModuleAppShell
        theme="indigo"
        beforeHeader={isSupabaseConfigured() ? <SupabaseRoleSync /> : null}
        sidebar={
          <ModuleSidebar
            theme="indigo"
            sections={filteredSections}
            activeTab={activeTab}
            onNavigate={setActiveTab}
            user={{ name: currentUser.name, roleLabel, roleBadge }}
          />
        }
        bottomNav={
          <ModuleBottomNav
            theme="indigo"
            mainTabs={GENERIC_MAIN_TABS}
            moreTabs={[]}
            activeTab={activeTab}
            onNavigate={setActiveTab}
          />
        }
        overlays={
          <>
            <ConfirmDialog />
            <ToastContainer />
          </>
        }
      >
        {renderView()}
      </ModuleAppShell>
    </ModuleLabelsProvider>
  );
};
