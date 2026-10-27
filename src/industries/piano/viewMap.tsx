import { type ReactNode, lazy, Suspense } from 'react';
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
import { getPianoSettingsExtras } from './config/pianoSettingsExtras';
import {
  PIANO_ATTENDANCE_HUB_TABS,
  PIANO_CUSTOMER_HUB_TABS,
  PIANO_SCHEDULE_HUB_TABS,
  PIANO_SETTINGS_HUB_TABS,
} from './config/hubRoutes';
import { AvailabilitySettingsView } from '@/capabilities/scheduling/availability';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { PracticeRoomBookingView } from './components/practiceRooms/PracticeRoomBookingView';

const RetentionMarketingView = lazy(() =>
  import('@/capabilities/retention_marketing').then((m) => ({
    default: m.RetentionMarketingView,
  }))
);
const VehicleShuttleView = lazy(() =>
  import('@/capabilities/vehicle_shuttle').then((m) => ({
    default: m.VehicleShuttleCommuteView,
  }))
);
const MembershipReferralTreeView = lazy(() =>
  import('@/capabilities/membership_referral_tree').then((m) => ({
    default: m.MembershipReferralTreeView,
  }))
);
const InventoryListView = lazy(() =>
  import('@/industries/retail/components/inventory/InventoryListView').then((m) => ({
    default: m.InventoryListView,
  }))
);

function PianoSettingsHub() {
  const { currentOrganization, activeCapabilities = [], hiddenCapabilities = [] } =
    useOrganization();
  const preset = getIndustryPreset(currentOrganization?.industry_type || 'piano');
  const baseCaps = (preset?.capabilities ?? []) as string[];
  const requiredCaps = new Set<string>((preset?.requiredCapabilities ?? []) as string[]);
  const customAddons = ((currentOrganization?.settings as { custom_addons?: string[] })
    ?.custom_addons ?? []) as string[];
  const hiddenSet = new Set(hiddenCapabilities);
  const enabledCaps = Array.from(
    new Set([...baseCaps, ...activeCapabilities, ...customAddons])
  ).filter((cap) => requiredCaps.has(cap) || !hiddenSet.has(cap));

  return (
    <SettingsHubView
      extras={getPianoSettingsExtras(enabledCaps)}
      workplaceLabel="학원"
      staffLabel="선생님"
    />
  );
}

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

const lazyCap = (node: ReactNode, label: string) => (
  <Suspense fallback={<div className="p-8 text-center text-slate-400">{label} 불러오는 중...</div>}>
    {node}
  </Suspense>
);

/**
 * 탭 → 화면. 허브 딥링크 목록은 config/hubRoutes.ts 단일 출처.
 * lessons → 출결: 레거시 딥링크 유지 (기능·URL 탭명 삭제 없음).
 * seat-rooms → practice-rooms: 프리셋 seat_room 과 UX 단일화.
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
  'practice-rooms': () => <PracticeRoomBookingView />,
  /** Refine /seat-rooms · 프리셋 seat_room → 연습실 UX로 통일 */
  'seat-rooms': () => <PracticeRoomBookingView />,
  spaces: () => <PracticeRoomBookingView />,
  resources: () => <ResourceManagementView />,
  textbooks: () => <TextbookManagementView />,
  passes: () => <PassManagementView config={pianoPassConfig} />,
  recitals: () => <RecitalManagementView />,
  curriculum: () => <CurriculumManagementView />,
  assignments: () => <AssignmentsManagementView />,
  achievements: () => <AchievementsManagementView />,
  'song-stamps': () => <SongProgressStaffView />,
  reports: () => <ReportsManagementView />,
  retention: () => lazyCap(<RetentionMarketingView />, '리텐션'),
  shuttle: () => lazyCap(<VehicleShuttleView />, '셔틀'),
  'family-tree': () => lazyCap(<MembershipReferralTreeView />, '패밀리'),
  supplies: () => lazyCap(<InventoryListView />, '소모품 재고'),
  ...hubViewAliases(() => <PianoSettingsHub />, PIANO_SETTINGS_HUB_TABS),
};

export default PIANO_VIEW_MAP;

export { PianoOverlays as Overlays } from './PianoOverlays';
