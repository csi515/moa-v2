import { type FC, type ReactNode } from 'react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import {
  DirectorFloatingFab,
  ToastContainer,
  ConfirmDialog,
  OnboardingWizard,
} from '@/shared/components';
import { OnboardingResumeCard } from '@/shared/components/onboarding/OnboardingResumeCard';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { PianoSidebar } from './layout/PianoSidebar';
import { PianoBottomNav } from './layout/PianoBottomNav';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { isSupabaseConfigured } from '@/lib/supabase';
import { financeViewEntries, hubViewAliases } from '@/core/industry/commonViewEntries';
import { AttendanceManagementView } from '@/capabilities/attendance';
import { PianoAttendanceView } from './components/attendance/PianoAttendanceView';
import { CustomerHubView } from '@/core/customer';
import { SettingsHubView } from '@/core/organizations/components/SettingsHubView';
import { StudentListView } from '@/capabilities/roster';
import { ClassManagementView } from '@/capabilities/scheduling';
import { GuardianEnrollmentRequestsView } from '@/capabilities/enrollment';
import {
  DashboardView,
  RecitalManagementView,
  TextbookManagementView,
  PracticeRecordsView,
  ResourceManagementView,
  CurriculumManagementView,
  AssignmentsManagementView,
  AchievementsManagementView,
  ReportsManagementView,
} from './index';
import { PassManagementView } from '@/capabilities/billing/ui/PassManagementView';
import { pianoPassConfig } from './config/passConfig';
import { PianoScheduleView } from './components/schedule';
import { PianoConsultationHubView } from './components/consultations';
import { SongProgressStaffView } from './components/songProgress';
import { PIANO_SETTINGS_EXTRAS } from './config/nav';
import {
  PIANO_ATTENDANCE_HUB_TABS,
  PIANO_CUSTOMER_HUB_TABS,
  PIANO_SCHEDULE_HUB_TABS,
  PIANO_SETTINGS_HUB_TABS,
} from './config/hubRoutes';
import { usePianoOnboardingUi } from './hooks/usePianoOnboardingUi';
import { AvailabilitySettingsView } from '@/capabilities/scheduling/availability';

const pianoSettingsHub = () => (
  <SettingsHubView extras={PIANO_SETTINGS_EXTRAS} workplaceLabel="학원" staffLabel="선생님" />
);

/** 설정 → 부가 → 상담 가능시간 (tab: bookings — 타업종 예약 탭과 이름만 공유, 피아노 전용 화면) */
const consultationAvailabilitySettings = () => (
  <AvailabilitySettingsView
    title="상담 가능시간"
    description="상담 예약을 받을 수 있는 요일·시간대를 설정합니다."
    defaultSlotTitle="상담"
    defaultSlotMinutes={30}
  />
);

const customerHub = () => (
  <CustomerHubView
    listView={StudentListView}
    enrollmentLabel="등록"
    guardianEnrollmentView={GuardianEnrollmentRequestsView}
  />
);
const scheduleHub = () => <PianoScheduleView />;
const attendanceHub = () => <PianoAttendanceView />;

/**
 * 탭 → 화면. 허브 딥링크 목록은 config/hubRoutes.ts 단일 출처.
 * lessons → 출결: 레거시 딥링크 유지 (기능·URL 탭명 삭제 없음).
 */
const PIANO_VIEW_MAP: Record<string, () => ReactNode> = {
  dashboard: () => <DashboardView />,
  ...hubViewAliases(customerHub, PIANO_CUSTOMER_HUB_TABS),
  ...hubViewAliases(attendanceHub, PIANO_ATTENDANCE_HUB_TABS),
  'check-in': () => <AttendanceManagementView />,
  ...hubViewAliases(scheduleHub, PIANO_SCHEDULE_HUB_TABS),
  ...financeViewEntries,
  classes: () => <ClassManagementView />,
  consultations: () => <PianoConsultationHubView />,
  bookings: consultationAvailabilitySettings,
  practice: () => <PracticeRecordsView />,
  resources: () => <ResourceManagementView />,
  textbooks: () => <TextbookManagementView />,
  passes: () => <PassManagementView config={pianoPassConfig} />,
  recitals: () => <RecitalManagementView />,
  curriculum: () => <CurriculumManagementView />,
  assignments: () => <AssignmentsManagementView />,
  achievements: () => <AchievementsManagementView />,
  'song-stamps': () => <SongProgressStaffView />,
  reports: () => <ReportsManagementView />,
  ...hubViewAliases(pianoSettingsHub, PIANO_SETTINGS_HUB_TABS),
};


export default PIANO_VIEW_MAP;
