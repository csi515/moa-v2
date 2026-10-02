import type { FC, ReactNode } from 'react';
import { CalendarDays, LayoutDashboard, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import { AcademySettingsView } from '@/core/organizations/components/AcademySettingsView';
import { accountViewEntry } from '@/core/industry/commonViewEntries';
import { ToastContainer, ConfirmDialog } from '@/shared/components';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { BathSidebar } from './layout/BathSidebar';
import { BathBottomNav } from './layout/BathBottomNav';
import { BathPlaceholderView } from './components/BathPlaceholderView';

const bathSettings = () => <AcademySettingsView />;

const BATH_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => (
    <div data-testid="director-home">
      <BathPlaceholderView
        title="홈"
        description="사우나·찜질방 운영 현황은 이후 단계에서 연결됩니다."
        icon={LayoutDashboard}
      />
    </div>
  ),
  members: () => (
    <BathPlaceholderView
      title="고객"
      description="고객 관리는 이후 단계에서 연결됩니다."
      icon={Users}
    />
  ),
  bookings: () => (
    <BathPlaceholderView
      title="예약"
      description="예약 기능은 아직 구현되지 않았습니다."
      icon={CalendarDays}
    />
  ),
  settings: bathSettings,
  notices: bathSettings,
  ...accountViewEntry,
};

export const BathAppContent: FC = () => {
  const { activeTab } = useApp();

  useTabGuard();

  const renderView = BATH_VIEW_MAP[activeTab] ?? BATH_VIEW_MAP.dashboard;

  return (
    <ModuleAppShell
      theme="orange"
      beforeHeader={isSupabaseConfigured() ? <SupabaseRoleSync /> : null}
      sidebar={<BathSidebar />}
      bottomNav={<BathBottomNav />}
      overlays={
        <>
          <ConfirmDialog />
          <ToastContainer />
        </>
      }
    >
      {renderView()}
    </ModuleAppShell>
  );
};
