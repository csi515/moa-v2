import type { NavTab } from '@/context/AppContext';
import type { FC, ReactNode } from 'react';
import { BookingCalendarView } from '@/capabilities/booking/ui/BookingCalendarView';
import { ServiceManagementView } from '@/capabilities/booking/ui/ServiceManagementView';
import {
  PilatesDashboardView,
  MemberListView,
  InstructorListView,
  PassManagementView,
} from './index';
import {
  attendanceViewEntry,
  financeViewEntries,
} from '@/core/industry/commonViewEntries';
import { SettingsHubView } from '@/core/organizations/components/SettingsHubView';
import { PilatesScheduleHubView } from './components/PilatesScheduleHubView';
import { PilatesCustomerHubView } from './components/PilatesCustomerHubView';

const pilatesSettingsHub = () => (
  <SettingsHubView
    staffView={InstructorListView}
    staffTab={'instructors' as NavTab}
    workplaceLabel="스튜디오"
    staffLabel="강사"
  />
);

const customerHub = () => (
  <PilatesCustomerHubView membersView={MemberListView} passesView={PassManagementView} />
);

const scheduleHub = () => (
  <PilatesScheduleHubView bookingsView={BookingCalendarView} servicesView={ServiceManagementView} />
);

const PILATES_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <PilatesDashboardView />,
  bookings: scheduleHub,
  services: scheduleHub,
  members: customerHub,
  passes: customerHub,
  instructors: pilatesSettingsHub,
  ...attendanceViewEntry,
  ...financeViewEntries,
  settings: pilatesSettingsHub,
  notices: pilatesSettingsHub,
  account: pilatesSettingsHub,
};


export default PILATES_VIEW_MAP;
