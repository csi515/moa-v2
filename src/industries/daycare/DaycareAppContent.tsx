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
import { DaycareSidebar } from './layout/DaycareSidebar';
import { DaycareBottomNav } from './layout/DaycareBottomNav';
import { DaycareDashboardView } from './components/dashboard/DaycareDashboardView';
import { StudentListView } from './components/students/StudentListView';
import {
  ClassManagementView,
  ClassScheduleHubView,
  ConsultationRecordsView,
  CustomerHubView,
  SettingsHubView,
} from '@/core/academy';
import {
  attendanceViewEntry,
  financeViewEntries,
} from '@/core/industry/commonViewEntries';
import { CareJournalView, CareRecordsView, MedicationRequestView } from './care';
import { DaycareCareHubView } from './components/DaycareCareHubView';

const daycareSettingsHub = () => (
  <SettingsHubView
    workplaceLabel="원"
    staffLabel="교사"
    extras={[{ tab: 'classes' as NavTab, label: '반 관리' }]}
  />
);

const customerHub = () => (
  <CustomerHubView listView={StudentListView} enrollmentLabel="학부모 등록 요청" />
);

const careHub = () => (
  <DaycareCareHubView
    journalsView={CareJournalView}
    medicationsView={MedicationRequestView}
    recordsView={CareRecordsView}
  />
);

const DAYCARE_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <DaycareDashboardView />,
  students: customerHub,
  parents: customerHub,
  'enrollment-requests': customerHub,
  classes: () => <ClassManagementView />,
  timetable: () => <ClassScheduleHubView />,
  calendar: () => <ClassScheduleHubView />,
  ...attendanceViewEntry,
  journals: careHub,
  medications: careHub,
  consultations: () => <ConsultationRecordsView />,
  ...financeViewEntries,
  settings: daycareSettingsHub,
  teachers: daycareSettingsHub,
  notices: daycareSettingsHub,
  account: daycareSettingsHub,
};

export const DaycareAppContent: FC = () => {
  const { activeTab } = useApp();
  const { isOwner } = usePermissions();

  useTabGuard();

  const renderView = DAYCARE_VIEW_MAP[activeTab] ?? DAYCARE_VIEW_MAP.dashboard;

  return (
    <ModuleAppShell
      theme="sky"
      beforeHeader={isSupabaseConfigured() ? <SupabaseRoleSync /> : null}
      sidebar={<DaycareSidebar />}
      bottomNav={<DaycareBottomNav />}
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
