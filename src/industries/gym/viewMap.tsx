import type { NavTab } from '@/context/AppContext';
import type { FC, ReactNode } from 'react';
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


export default GYM_VIEW_MAP;
