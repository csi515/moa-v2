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
import { GymSidebar } from './layout/GymSidebar';
import { GymBottomNav } from './layout/GymBottomNav';
import { GymDashboardView } from './components/dashboard/GymDashboardView';
import { StudentListView } from './components/students/StudentListView';
import { CustomerHubView } from '@/core/customer';
import { SettingsHubView } from '@/core/organizations/components/SettingsHubView';
import { ClassManagementView, ClassScheduleHubView } from '@/capabilities/scheduling';
import { GuardianEnrollmentRequestsView } from '@/capabilities/enrollment';
import {
  attendanceViewEntry,
  financeViewEntries,
} from '@/core/industry/commonViewEntries';
import { ShuttleRideRequestView } from '@/capabilities/transport';

const gymSettingsHub = () => (
  <SettingsHubView
    workplaceLabel="체육관"
    staffLabel="지도진"
    extras={[{ tab: 'classes' as NavTab, label: '수업반' }, { tab: 'shuttle' as NavTab, label: '차량 운행' }]}
  />
);

const customerHub = () => (
  <CustomerHubView
    listView={StudentListView}
    enrollmentLabel="회원 등록 요청"
    guardianEnrollmentView={GuardianEnrollmentRequestsView}
  />
);

const GYM_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <GymDashboardView />,
  students: customerHub,
  parents: customerHub,
  'enrollment-requests': customerHub,
  classes: () => <ClassManagementView />,
  timetable: () => <ClassScheduleHubView />,
  calendar: () => <ClassScheduleHubView />,
  ...attendanceViewEntry,
  shuttle: () => <ShuttleRideRequestView />,
  ...financeViewEntries,
  settings: gymSettingsHub,
  teachers: gymSettingsHub,
  notices: gymSettingsHub,
  account: gymSettingsHub,
};

export const GymAppContent: FC = () => {
  const { activeTab } = useApp();
  const { isOwner } = usePermissions();

  useTabGuard();

  const renderView = GYM_VIEW_MAP[activeTab] ?? GYM_VIEW_MAP.dashboard;

  return (
    <ModuleAppShell
      theme="orange"
      beforeHeader={isSupabaseConfigured() ? <SupabaseRoleSync /> : null}
      sidebar={<GymSidebar />}
      bottomNav={<GymBottomNav />}
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
