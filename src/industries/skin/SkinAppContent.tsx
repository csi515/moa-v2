import type { FC, ReactNode } from 'react';
import { useApp, type NavTab } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import {
  DirectorFloatingFab,
  ToastContainer,
  ConfirmDialog,
} from '@/shared/components';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SettingsHubView } from '@/core/organizations/components/SettingsHubView';
import {
  attendanceViewEntry,
  financeViewEntries,
} from '@/core/industry/commonViewEntries';
import {
  BookingCalendarView,
  InstructorListView,
  MemberListView,
  ServiceManagementView,
} from '@/industries/pilates';
import { PassManagementView } from '@/capabilities/billing/ui/PassManagementView';
import { skinPassConfig } from './config/passConfig';
import { SkinSidebar } from './layout/SkinSidebar';
import { SkinBottomNav } from './layout/SkinBottomNav';
import { SkinDashboardView } from './components/dashboard/SkinDashboardView';
import { SkinCustomerHubView, SkinScheduleHubView } from './components/SkinHubs';
import { SkinRetailView } from './components/retail/SkinRetailView';

const skinSettingsHub = () => (
  <SettingsHubView
    staffView={InstructorListView}
    staffTab={'instructors' as NavTab}
    workplaceLabel="피부관리샵"
    staffLabel="관리사"
  />
);

const customerHub = () => (
  <SkinCustomerHubView
    membersView={MemberListView}
    passesView={() => <PassManagementView config={skinPassConfig} />}
  />
);

const scheduleHub = () => (
  <SkinScheduleHubView bookingsView={BookingCalendarView} servicesView={ServiceManagementView} />
);

const SKIN_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <SkinDashboardView />,
  bookings: scheduleHub,
  services: scheduleHub,
  members: customerHub,
  passes: customerHub,
  instructors: skinSettingsHub,
  retail: () => <SkinRetailView />,
  ...attendanceViewEntry,
  ...financeViewEntries,
  settings: skinSettingsHub,
  notices: skinSettingsHub,
  account: skinSettingsHub,
};

export const SkinAppContent: FC = () => {
  const { activeTab } = useApp();
  const { isOwner } = usePermissions();

  useTabGuard();

  const renderView = SKIN_VIEW_MAP[activeTab] ?? SKIN_VIEW_MAP.dashboard;

  return (
    <ModuleAppShell
      theme="rose"
      beforeHeader={isSupabaseConfigured() ? <SupabaseRoleSync /> : null}
      sidebar={<SkinSidebar />}
      bottomNav={<SkinBottomNav />}
      overlays={
        <>
          {isOwner && <DirectorFloatingFab />}
          <ConfirmDialog />
          <ToastContainer />
        </>
      }
    >
      {renderView()}
    </ModuleAppShell>
  );
};
