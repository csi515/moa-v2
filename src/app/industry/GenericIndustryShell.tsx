import { type FC, type ReactNode, useMemo, useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { CAPABILITY_LIST_VIEWS } from './capabilityListViews';
import {
  Home,
  Settings,
  User,
  Users,
  UserPlus,
  ArrowRight,
  Building2,
  Sparkles,
  Calendar,
  CheckCircle2,
  Ticket,
  Lock,
  Wallet,
  MessageSquare,
  Package,
  Clock,
  ClipboardList,
  Workflow,
  FileText,
  SlidersHorizontal,
  Award,
  Car,
  AlertTriangle,
  Wrench,
  LayoutGrid,
  ShieldAlert,
  FileCheck,
  FolderKanban,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { useTabGuard } from '@/shared/navigation/useTabGuard';
import { accountViewEntry, financeViewEntries } from '@/core/industry/commonViewEntries';
import { getIndustryPreset } from '@/app/presets/presetRegistry';
import { GettingStartedQuestWidget } from '@/app/onboarding/GettingStartedQuestWidget';
import { BusinessHealthWidget } from '@/shared/components/diagnostics';
import { CompanyAppLauncherDashboard } from '@/pages/workspace/CompanyAppLauncherDashboard';

const WorkplaceSettingsView = lazy(() =>
  import('@/core/organizations/components/WorkplaceSettingsView').then((m) => ({ default: m.WorkplaceSettingsView }))
);
const WorkspaceIntranetHubPage = lazy(() =>
  import('@/pages/workspace/WorkspaceIntranetHubPage').then((m) => ({ default: m.WorkspaceIntranetHubPage }))
);
const AttendanceView = lazy(() =>
  import('@/capabilities/attendance').then((m) => ({ default: m.AttendanceManagementView }))
);
const BookingView = lazy(() =>
  import('@/capabilities/booking/ui/BookingCalendarView').then((m) => ({ default: m.BookingCalendarView }))
);
const SeatRoomView = lazy(() =>
  import('@/capabilities/seat_room').then((m) => ({ default: m.SeatRoomManagementView }))
);
const PassesView = lazy(() =>
  import('@/pages/passes/list').then((m) => ({ default: m.PassesListPage }))
);
const LockersView = lazy(() =>
  import('@/pages/lockers/grid').then((m) => ({ default: m.LockersGridPage }))
);
const ConsultationView = lazy(() =>
  import('@/capabilities/consultation').then((m) => ({ default: m.ConsultationRecordsView }))
);
const InventoryView = lazy(() =>
  import('@/industries/retail/components/inventory/InventoryListView').then((m) => ({ default: m.InventoryListView }))
);
const SafetyConsentView = lazy(() =>
  import('@/capabilities/safety_consent').then((m) => ({ default: m.SafetyConsentManagementView }))
);
const TaskPipelineView = lazy(() =>
  import('@/capabilities/task_pipeline').then((m) => ({ default: m.TaskPipelineKanbanView }))
);
const TreatmentChartView = lazy(() =>
  import('@/capabilities/treatment_chart').then((m) => ({ default: m.TreatmentChartManagementView }))
);
const RentalEquipmentView = lazy(() =>
  import('@/capabilities/rental_equipment').then((m) => ({ default: m.RentalEquipmentManagementView }))
);
const MaintenanceChecklistView = lazy(() =>
  import('@/capabilities/maintenance_checklist').then((m) => ({ default: m.MaintenanceChecklistManagementView }))
);
const ShiftScheduleView = lazy(() =>
  import('@/capabilities/shift_schedule').then((m) => ({ default: m.ShiftScheduleManagementView }))
);
const CurriculumProgressView = lazy(() =>
  import('@/capabilities/curriculum_progress').then((m) => ({ default: m.CurriculumProgressManagementView }))
);
const RetentionMarketingView = lazy(() =>
  import('@/capabilities/retention_marketing').then((m) => ({ default: m.RetentionMarketingView }))
);
const KitchenDisplaySystemView = lazy(() =>
  import('@/capabilities/table_order_kds').then((m) => ({ default: m.KitchenDisplaySystemView }))
);
const DietBodyLogView = lazy(() =>
  import('@/capabilities/diet_body_log').then((m) => ({ default: m.DietBodyLogManagementView }))
);
const VehicleShuttleView = lazy(() =>
  import('@/capabilities/vehicle_shuttle').then((m) => ({ default: m.VehicleShuttleCommuteView }))
);
const CommissionPayrollView = lazy(() =>
  import('@/capabilities/commission_payroll').then((m) => ({ default: m.CommissionPayrollManagementView }))
);
const LostFoundView = lazy(() =>
  import('@/capabilities/lost_found').then((m) => ({ default: m.LostFoundManagementView }))
);
const RecipeBomView = lazy(() =>
  import('@/capabilities/recipe_bom').then((m) => ({ default: m.RecipeBomManagementView }))
);
const DigitalContractView = lazy(() =>
  import('@/capabilities/digital_contract').then((m) => ({ default: m.DigitalContractManagementView }))
);
const SeatTimerBillingView = lazy(() =>
  import('@/capabilities/seat_timer_billing').then((m) => ({ default: m.SeatTimerBillingView }))
);
const TreatmentPortfolioView = lazy(() =>
  import('@/capabilities/treatment_portfolio').then((m) => ({ default: m.TreatmentPortfolioView }))
);
const WorkOrderKanbanView = lazy(() =>
  import('@/capabilities/work_order_kanban').then((m) => ({ default: m.WorkOrderKanbanView }))
);
const WaitlistTurnQueueView = lazy(() =>
  import('@/capabilities/waitlist_turn_queue').then((m) => ({ default: m.WaitlistTurnQueueView }))
);
const DepositEscrowView = lazy(() =>
  import('@/capabilities/deposit_escrow').then((m) => ({ default: m.DepositEscrowManagementView }))
);
const EquipmentLifecycleView = lazy(() =>
  import('@/capabilities/equipment_lifecycle').then((m) => ({ default: m.EquipmentLifecycleManagementView }))
);
const PackageSplitBillingView = lazy(() =>
  import('@/capabilities/package_split_billing').then((m) => ({ default: m.PackageSplitBillingManagementView }))
);
const ExamGradeAnalyticsView = lazy(() =>
  import('@/capabilities/exam_grade_analytics').then((m) => ({ default: m.ExamGradeAnalyticsManagementView }))
);
const KioskStaffCallView = lazy(() =>
  import('@/capabilities/kiosk_staff_call').then((m) => ({ default: m.KioskStaffCallView }))
);
const MembershipReferralTreeView = lazy(() =>
  import('@/capabilities/membership_referral_tree').then((m) => ({ default: m.MembershipReferralTreeView }))
);
const HygieneHaccpLogView = lazy(() =>
  import('@/capabilities/hygiene_haccp_log').then((m) => ({ default: m.HygieneHaccpLogView }))
);
const DesktopSopRiskMatrixView = lazy(() =>
  import('@/capabilities/sop_risk_assessment').then((m) => ({ default: m.DesktopSopRiskMatrixView }))
);
const RiskApprovalInboxView = lazy(() =>
  import('@/capabilities/sop_risk_assessment').then((m) => ({ default: m.RiskApprovalInboxView }))
);
const WorkerRepledgeHost = lazy(() =>
  import('@/capabilities/sop_risk_assessment/components/WorkerRepledgeHost').then((m) => ({
    default: m.WorkerRepledgeHost,
  }))
);
const VendorApInvoiceView = lazy(() =>
  import('@/capabilities/vendor_ap_invoice').then((m) => ({ default: m.VendorApInvoiceView }))
);
const WorkAttendancePayrollView = lazy(() =>
  import('@/capabilities/work_attendance_payroll').then((m) => ({ default: m.WorkAttendancePayrollView }))
);
const PickupOrdersKanbanView = lazy(() =>
  import('@/capabilities/pickup_orders').then((m) => ({ default: m.PickupOrdersKanbanView }))
);
const LoyaltyStampView = lazy(() =>
  import('@/capabilities/loyalty_stamp').then((m) => ({ default: m.LoyaltyStampView }))
);
const WorkplacePolicyView = lazy(() =>
  import('@/capabilities/workplace_policy').then((m) => ({ default: m.WorkplacePolicyManagementView }))
);
const FeedbacksAndHandoverView = lazy(() =>
  import('@/capabilities/feedbacks').then((m) => ({ default: m.FeedbacksAndHandoverView }))
);
const TrialFunnelKanbanView = lazy(() =>
  import('@/capabilities/trial_funnel').then((m) => ({ default: m.TrialFunnelKanbanView }))
);
const LearningJournalFeedView = lazy(() =>
  import('@/capabilities/learning_journal').then((m) => ({ default: m.LearningJournalFeedView }))
);
const LevelAssessmentView = lazy(() =>
  import('@/capabilities/level_assessment').then((m) => ({ default: m.LevelAssessmentView }))
);
const SpaceTurnaroundView = lazy(() =>
  import('@/capabilities/space_turnaround').then((m) => ({ default: m.SpaceTurnaroundView }))
);
const SupplyRestockView = lazy(() =>
  import('@/capabilities/supply_restock').then((m) => ({ default: m.SupplyRestockView }))
);
const MakeupLessonPassView = lazy(() =>
  import('@/capabilities/makeup_lesson_pass').then((m) => ({ default: m.MakeupLessonPassView }))
);
const IntakeAssessmentView = lazy(() =>
  import('@/capabilities/intake_assessment').then((m) => ({ default: m.IntakeAssessmentView }))
);
const DailyCareReportView = lazy(() =>
  import('@/capabilities/daily_care_report').then((m) => ({ default: m.DailyCareReportView }))
);
const SubstituteDispatchView = lazy(() =>
  import('@/capabilities/substitute_dispatch').then((m) => ({ default: m.SubstituteDispatchView }))
);
const EntryPassTicketView = lazy(() =>
  import('@/capabilities/entry_pass_ticket').then((m) => ({ default: m.EntryPassTicketView }))
);
const EventContestHubView = lazy(() =>
  import('@/capabilities/event_contest_hub').then((m) => ({ default: m.EventContestHubView }))
);
const FacilityIncidentReportView = lazy(() =>
  import('@/capabilities/facility_incident_report').then((m) => ({ default: m.FacilityIncidentReportView }))
);
const NpsSurveyCollectorView = lazy(() =>
  import('@/capabilities/nps_survey_collector').then((m) => ({ default: m.NpsSurveyCollectorView }))
);
const AchievementQuestBadgeView = lazy(() =>
  import('@/capabilities/achievement_quest_badge').then((m) => ({ default: m.AchievementQuestBadgeView }))
);
const ParkingValidatorView = lazy(() =>
  import('@/capabilities/parking_validator').then((m) => ({ default: m.ParkingValidatorView }))
);
const EmergencyAlertBroadcastView = lazy(() =>
  import('@/capabilities/emergency_alert_broadcast').then((m) => ({ default: m.EmergencyAlertBroadcastView }))
);
const DigitalGuestbookView = lazy(() =>
  import('@/capabilities/digital_guestbook').then((m) => ({ default: m.DigitalGuestbookView }))
);
const MboManagementView = lazy(() =>
  import('@/capabilities/mbo').then((m) => ({ default: m.MboManagementView }))
);
const ResearchProjectManagementView = lazy(() =>
  import('@/capabilities/research_project').then((m) => ({
    default: m.ResearchProjectManagementView,
  }))
);
const QualityInspectionManagementView = lazy(() =>
  import('@/capabilities/quality_inspection').then((m) => ({ default: m.QualityInspectionManagementView }))
);
const ChangeManagementView = lazy(() =>
  import('@/capabilities/change_management').then((m) => ({ default: m.ChangeManagementView }))
);
const PatentAssetManagementView = lazy(() =>
  import('@/capabilities/patent_ip_asset').then((m) => ({ default: m.PatentAssetManagementView }))
);
const LeaveManagementDashboardView = lazy(() =>
  import('@/capabilities/leave_management').then((m) => ({ default: m.LeaveManagementDashboardView }))
);
const ApprovalWorkflowWithLinkedSync = lazy(() =>
  import('@/pages/workspace/ApprovalWorkflowWithLinkedSync').then((m) => ({
    default: m.ApprovalWorkflowWithLinkedSync,
  }))
);
const UniversalResourceCalendarView = lazy(() =>
  import('@/capabilities/resources').then((m) => ({ default: m.UniversalResourceCalendarView }))
);
const GrievanceListPage = lazy(() =>
  import('@/capabilities/whistleblower_grievance').then((m) => ({ default: m.GrievanceListPage }))
);
const CapabilitySwitchboardView = lazy(() =>
  import('@/pages/settings/CapabilitySwitchboardPage').then((m) => ({ default: m.CapabilitySwitchboardPage }))
);
const DispatchListPage = lazy(() =>
  import('@/capabilities/field_dispatch').then((m) => ({ default: m.DispatchListPage }))
);
const PromotionListPage = lazy(() =>
  import('@/capabilities/promotional_deal').then((m) => ({ default: m.PromotionListPage }))
);
const WaitlistPage = lazy(() =>
  import('@/capabilities/waitlist_queue').then((m) => ({ default: m.WaitlistPage }))
);

import { PluginErrorBoundary } from '@/shared/components/PluginErrorBoundary';
import { DirectorFloatingFab, ToastContainer, ConfirmDialog } from '@/shared/components';
import { ExecutiveRiskDashboardWidget } from '@/shared/components/ExecutiveRiskDashboardWidget';
import { ModuleAppShell } from '@/shared/components/layout/ModuleAppShell';
import { ModuleSidebar } from '@/shared/components/layout/ModuleSidebar';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getModuleChrome } from '@/app/industry/moduleChromeRegistry';
import {
  isCorporateChromePreset,
  resolveModuleIndustryId,
} from '@/app/industry/resolveModuleIndustry';
import { SupabaseRoleSync } from '@/SupabaseRoleSync';
import { MORE_NAV_SECTION } from '@/core/auth/navUtils';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getIndustryLabel, shouldUseGenericShell } from '@/core/industry/types';
import { useOrganization } from '@/core/organizations/OrganizationProvider';
import type { NavMenuItem, NavMenuSection } from '@/core/auth/navUtils';
import { filterNavSections } from '@/core/auth/navUtils';
import { isNavTabAllowed, normalizeRolePermissions } from '@/domain/permissions';
import { useTerminology } from '@/core/terminology';
const StudentListView = lazy(() =>
  import('@/capabilities/roster').then((m) => ({ default: m.StudentListView }))
);
const StudentFormModal = lazy(() =>
  import('@/capabilities/roster').then((m) => ({ default: m.StudentFormModal }))
);
import { StorageService } from '@/services/storage';
import {
  TAB_REQUIRED_CAPABILITIES,
  TAB_METADATA,
  getTabMetadata,
  isTabAllowedForCapabilities,
} from './genericIndustryTabs';

export {
  shouldUseGenericShell,
  TAB_REQUIRED_CAPABILITIES,
  TAB_METADATA,
  getTabMetadata,
  isTabAllowedForCapabilities,
};

interface GenericDashboardViewProps {
  onNavigate: (tab: any) => void;
  enabledCaps?: string[];
}

function GenericDashboardView({ onNavigate, enabledCaps = [] }: GenericDashboardViewProps) {
  const { currentOrganization } = useOrganization();
  const { industry } = usePermissions();

  const isCorporatePreset = useMemo(() => {
    const it = currentOrganization?.industry_type || industry;
    return (
      it === 'general_enterprise' ||
      it === 'rnd_lab_management' ||
      it === 'corporate_general_affairs' ||
      (enabledCaps.includes('mbo') && enabledCaps.includes('research_project'))
    );
  }, [currentOrganization?.industry_type, industry, enabledCaps]);

  if (isCorporatePreset) {
    return (
      <div className="max-w-5xl mx-auto pt-2 sm:pt-4" data-testid="corporate-launcher-home">
        <CompanyAppLauncherDashboard
          variant="home"
          enabledCapabilityIds={enabledCaps}
        />
      </div>
    );
  }
  const { t } = useTerminology(currentOrganization?.industry_type || industry);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const customerWord = t('customer.singular', '고객');
  const placeWord = t('place.singular', '사업장');
  const industryLabel = getIndustryLabel(currentOrganization?.industry_type || industry);

  const allCustomers = StorageService.getStudents();
  const activeCustomers = allCustomers.filter((c) => c.status === 'active');

  const hasPasses = enabledCaps.includes('passes');
  const hasBookings = enabledCaps.includes('booking') || enabledCaps.includes('seat_room');
  const showRiskWidget =
    enabledCaps.includes('facility_incident_report') ||
    enabledCaps.includes('sop_risk_assessment') ||
    Boolean((currentOrganization?.settings as any)?.show_risk_dashboard);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pt-2 sm:pt-4" data-testid="director-home">
      {/* 환영 및 사업장 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
            <Building2 className="w-3.5 h-3.5" />
            <span>{industryLabel}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {currentOrganization?.name || placeWord}
          </h1>
          <p className="text-indigo-100 text-sm max-w-xl">
            {industryLabel} 운영을 위한 범용 워크스페이스입니다. {customerWord} 관리, 일정, 시설 및 설정을 효율적으로 운영해보세요.
          </p>
        </div>
      </div>

      {/* 사업장 맞춤형 첫걸음 퀘스트(Getting Started) 위젯 */}
      <GettingStartedQuestWidget
        onNavigate={onNavigate}
        organizationId={currentOrganization?.id}
        industryType={currentOrganization?.industry_type || industry}
        customerWord={customerWord}
        placeWord={placeWord}
        onOpenCustomerModal={() => setIsFormOpen(true)}
      />

      {/* 업종별 경영 건전성 자동 진단(Business Health Diagnostic) 위젯 */}
      <BusinessHealthWidget
        industryType={currentOrganization?.industry_type || industry}
        diagnosticInput={{
          totalCustomers: allCustomers.length,
          activeCustomers: activeCustomers.length,
          expiringCustomersThisMonth: Math.round(allCustomers.length * 0.15) || 5,
          reEnrolledCustomersThisMonth: Math.round(allCustomers.length * 0.12) || 4,
          inactiveTwoWeeksCount: Math.max(0, allCustomers.length - activeCustomers.length),
        }}
        onNavigate={onNavigate}
      />

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">전체 {customerWord}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{allCustomers.length}명</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">활동 중인 {customerWord}</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{activeCustomers.length}명</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">운영 상태</p>
            <p className="text-2xl font-black text-slate-800 mt-1">정상 운영 중</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 전사 통합 경영 리스크 지수 위젯 (안전사고/위험평가 기능 활성화 시에만 노출) */}
      {showRiskWidget && <ExecutiveRiskDashboardWidget />}

      {/* 빠른 작업 */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">빠른 작업</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-between p-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 text-indigo-900 hover:bg-indigo-100/70 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{customerWord} 신규 등록</p>
                <p className="text-xs text-indigo-700/80">맞춤 정보 포함 등록</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-indigo-600" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('students')}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{customerWord} 목록 조회</p>
                <p className="text-xs text-slate-500">전체 명단 및 상세</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold">{placeWord} 설정</p>
                <p className="text-xs text-slate-500">운영 기본 정보</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {isFormOpen && (
        <Suspense fallback={null}>
        <StudentFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSaved={() => {
            setIsFormOpen(false);
          }}
        />
        </Suspense>
      )}
    </div>
  );
}


/** 모듈 미개발 업종 및 신규 업종용 확장형 공통 셸 */
export const GenericIndustryShell: FC<{ viewMap?: Record<string, () => ReactNode>; Overlays?: React.ComponentType | null }> = ({ viewMap: externalViewMap, Overlays }) => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const { allowedTabs, roleLabel, roleBadge, industry, isOwner } = usePermissions();
  const { currentOrganization, activeCapabilities = [], hiddenCapabilities = [] } = useOrganization();
  const { t } = useTerminology(currentOrganization?.industry_type || industry);

  const customerWord = t('customer.singular', '고객');

  const preset = useMemo(() => {
    return getIndustryPreset(currentOrganization?.industry_type || industry);
  }, [currentOrganization?.industry_type, industry]);

  const enabledCaps = useMemo(() => {
    const baseCaps = (preset?.capabilities ?? []) as string[];
    const requiredCaps = new Set<string>((preset?.requiredCapabilities ?? []) as string[]);
    const customAddons = ((currentOrganization?.settings as any)?.custom_addons ?? []) as string[];
    const hiddenSet = new Set<string>(hiddenCapabilities);
    const combined = new Set<string>([...baseCaps, ...activeCapabilities, ...customAddons]);
    return Array.from(combined).filter((cap) => requiredCaps.has(cap) || !hiddenSet.has(cap));
  }, [preset, activeCapabilities, hiddenCapabilities, currentOrganization?.settings]);


  const navSections: NavMenuSection[] = useMemo(() => {
    const items: NavMenuItem[] = [{ tab: 'dashboard', label: '홈', icon: <Home className="w-4 h-4" /> }];
    if (isTabAllowedForCapabilities('students', enabledCaps)) {
      items.push({ tab: 'students', label: `${customerWord} 관리`, icon: <Users className="w-4 h-4" /> });
    }

    const hasIntranetSuite =
      enabledCaps.includes('mbo') ||
      enabledCaps.includes('whistleblower_grievance') ||
      enabledCaps.includes('research_project') ||
      enabledCaps.includes('approval_workflow');
    if (hasIntranetSuite) {
      items.splice(1, 0, {
        tab: 'intranet-hub',
        label: '사내 업무',
        icon: <Building2 className="w-4 h-4" />,
      });
    }

    if (enabledCaps.includes('booking') || enabledCaps.includes('seat_room')) {
      items.push({ tab: 'bookings', label: '예약·공간', icon: <Calendar className="w-4 h-4" /> });
      items.push({ tab: 'fleet', label: '공용자원 예약', icon: <Car className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('attendance')) {
      items.push({ tab: 'attendance', label: '출결 관리', icon: <CheckCircle2 className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('passes')) {
      items.push({ tab: 'passes', label: '이용권·회원권', icon: <Ticket className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('locker')) {
      items.push({ tab: 'lockers', label: '사물함·락커', icon: <Lock className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('consultation_crm') || enabledCaps.includes('consultation')) {
      items.push({ tab: 'consultations', label: '상담 내역', icon: <MessageSquare className="w-4 h-4" /> });
    }
    if (
      enabledCaps.includes('billing_invoicing') ||
      enabledCaps.includes('ledger_simple') ||
      enabledCaps.includes('credit_wallet') ||
      enabledCaps.includes('billing')
    ) {
      items.push({ tab: 'finance', label: '수납·정산', icon: <Wallet className="w-4 h-4" /> });
    }

    const extendedItems: NavMenuItem[] = [];
    if (enabledCaps.includes('rental_equipment')) {
      extendedItems.push({ tab: 'rentals', label: '장비 대여', icon: <Clock className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('equipment_lifecycle')) {
      extendedItems.push({ tab: 'equipment-lifecycle', label: '장비 수명주기', icon: <Wrench className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('seat_room')) {
      extendedItems.push({ tab: 'seat-rooms', label: '공간·좌석', icon: <LayoutGrid className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('hygiene_haccp_log')) {
      extendedItems.push({ tab: 'hygiene-log', label: '위생·HACCP', icon: <ClipboardList className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('sop_risk_assessment')) {
      extendedItems.push({ tab: 'sop-risk', label: 'SOP·위험성평가', icon: <ShieldAlert className="w-4 h-4" /> });
      extendedItems.push({ tab: 'risk-approvals', label: '내 결재 대기함', icon: <FileCheck className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('maintenance_checklist')) {
      extendedItems.push({ tab: 'maintenance', label: '시설 점검', icon: <ClipboardList className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('instructor_match')) {
      extendedItems.push({ tab: 'instructors', label: '강사 매칭', icon: <Users className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('shift_schedule')) {
      extendedItems.push({ tab: 'shifts', label: '근무 시프트', icon: <Clock className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('task_pipeline')) {
      extendedItems.push({ tab: 'pipelines', label: '파이프라인', icon: <Workflow className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('treatment_chart')) {
      extendedItems.push({ tab: 'charts', label: '시술 차트', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('safety_consent')) {
      extendedItems.push({ tab: 'consents', label: '안전 동의서', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('inventory') || enabledCaps.includes('commerce')) {
      extendedItems.push({ tab: 'inventory', label: '재고·상품', icon: <Package className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('loyalty_stamp')) {
      extendedItems.push({ tab: 'loyalty-stamps', label: '전자 스탬프', icon: <Award className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('workplace_policy')) {
      extendedItems.push({ tab: 'policies', label: '매장 사규·내규', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('feedbacks')) {
      extendedItems.push({ tab: 'handover', label: '현장 소통·인수인계', icon: <ClipboardList className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('trial_funnel')) {
      extendedItems.push({ tab: 'trial-funnel', label: '체험·상담 파이프라인', icon: <Sparkles className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('learning_journal')) {
      extendedItems.push({ tab: 'learning-journal', label: '수업 일지·알림장', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('level_assessment')) {
      extendedItems.push({ tab: 'level-assessment', label: '승급 심사·합격증', icon: <Award className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('space_turnaround')) {
      extendedItems.push({ tab: 'space-turnaround', label: '공간 턴어라운드', icon: <Sparkles className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('supply_restock')) {
      extendedItems.push({ tab: 'supply-restock', label: '소모품 안전재고', icon: <Package className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('makeup_lesson_pass')) {
      extendedItems.push({ tab: 'makeup-lesson-pass', label: '결석 보강 매칭', icon: <Calendar className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('intake_assessment')) {
      extendedItems.push({ tab: 'intake-assessment', label: '사전 문진표', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('daily_care_report')) {
      extendedItems.push({ tab: 'daily-care-report', label: '일일 안심 알림장', icon: <ClipboardList className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('substitute_dispatch')) {
      extendedItems.push({ tab: 'substitute-dispatch', label: '강사 대강 긴급호출', icon: <Users className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('entry_pass_ticket')) {
      extendedItems.push({ tab: 'entry-pass-ticket', label: '일일 모바일 입장권', icon: <Ticket className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('event_contest_hub')) {
      extendedItems.push({ tab: 'event-contest-hub', label: '원내 발표회·대회', icon: <Award className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('facility_incident_report')) {
      extendedItems.push({ tab: 'facility-incident-report', label: '안전사고·보험대장', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('nps_survey_collector')) {
      extendedItems.push({ tab: 'nps-survey-collector', label: '만족도·NPS 설문', icon: <Sparkles className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('achievement_quest_badge')) {
      extendedItems.push({ tab: 'achievement-quest-badge', label: '성취 퀘스트·뱃지', icon: <Award className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('parking_validator')) {
      extendedItems.push({ tab: 'parking-validator', label: '무료주차 등록·정산', icon: <Car className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('emergency_alert_broadcast')) {
      extendedItems.push({ tab: 'emergency-broadcast', label: '긴급휴원·재난공지', icon: <AlertTriangle className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('digital_guestbook')) {
      extendedItems.push({ tab: 'digital-guestbook', label: '전자 방명록·상담접수', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('mbo')) {
      extendedItems.push({ tab: 'mbo', label: '목표관리(MBO)', icon: <Award className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('research_project')) {
      extendedItems.push({ tab: 'lab-projects', label: '연구과제', icon: <FolderKanban className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('quality_inspection')) {
      extendedItems.push({ tab: 'quality', label: '품질 검사(QC)', icon: <CheckCircle2 className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('change_management')) {
      extendedItems.push({ tab: 'change-management', label: '4M 설계변경', icon: <Workflow className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('patent_ip_asset')) {
      extendedItems.push({ tab: 'patent-ip-asset', label: '특허·직무발명', icon: <Sparkles className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('approval_workflow')) {
      extendedItems.push({ tab: 'approval-workflow', label: '전자 결재', icon: <FileText className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('leave_management')) {
      extendedItems.push({ tab: 'leave-management', label: '휴가·연차 관리', icon: <Calendar className="w-4 h-4" /> });
    }
    if (enabledCaps.includes('whistleblower_grievance')) {
      extendedItems.push({ tab: 'grievances', label: '노경 건의함', icon: <MessageSquare className="w-4 h-4" /> });
    }

    const sections: NavMenuSection[] = [
      {
        title: '주요 업무',
        items,
      },
    ];

    if (extendedItems.length > 0) {
      sections.push({
        title: '맞춤 운영 도구',
        items: extendedItems,
      });
    }

    sections.push({
      title: '관리',
      items: [
        { tab: 'settings', label: '설정', icon: <Settings className="w-4 h-4" /> },
        { tab: 'account', label: '내 계정', icon: <User className="w-4 h-4" /> },
      ],
    });

    return sections;
  }, [customerWord, enabledCaps]);

  const mainTabs = useMemo(() => navSections[0].items, [navSections]);

  const filteredSections = useMemo(() => {
    const sections = filterNavSections(navSections, allowedTabs);
    let flags = null;
    try {
      const stored = StorageService.getActiveUser()?.customRole?.permissions;
      flags = normalizeRolePermissions(stored);
    } catch {
      flags = null;
    }
    if (!flags) return sections;
    const member = { role: isOwner ? 'owner' : 'staff', customRole: { permissions: flags } };
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => isNavTabAllowed(item.tab, member)),
      }))
      .filter((section) => section.items.length > 0);
  }, [navSections, allowedTabs, isOwner]);

  useTabGuard();

  const { tab: urlTab } = useParams<{ tab?: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  /** 기업 크롬: 런처 전용 경로와 셸 탭 이중 진입을 합친다 */
  const CORPORATE_DEDICATED_TAB_ROUTES: Record<string, string> = {
    'approval-workflow': '/workspace/approvals',
    'sop-risk': '/workspace/sop-risk',
    'risk-approvals': '/workspace/sop-risk',
    fleet: '/workspace/resources',
    bookings: '/workspace/resources',
    inventory: '/workspace/inventory',
    'supply-restock': '/workspace/supply-restock',
  };

  const navigateCorporateTab = (tab: string) => {
    const industryType = currentOrganization?.industry_type || industry;
    if (isCorporateChromePreset(industryType)) {
      const dedicated = CORPORATE_DEDICATED_TAB_ROUTES[tab];
      if (dedicated) {
        navigate(dedicated);
        return;
      }
    }
    setActiveTab(tab);
  };

  const defaultViewMap: Record<string, () => ReactNode> = {
    dashboard: () => <GenericDashboardView onNavigate={setActiveTab} enabledCaps={enabledCaps} />,
    'intranet-hub': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사내 허브를 불러오는 중...</div>}>
        <WorkspaceIntranetHubPage enabledCapabilityIds={enabledCaps} />
      </Suspense>
    ),
    'approval-workflow': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">전자 결재를 불러오는 중...</div>}>
        <ApprovalWorkflowWithLinkedSync />
      </Suspense>
    ),
    approvals: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">전자 결재를 불러오는 중...</div>}>
        <ApprovalWorkflowWithLinkedSync />
      </Suspense>
    ),
    students: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">명단을 불러오는 중...</div>}>
        <StudentListView />
      </Suspense>
    ),
    bookings: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">예약 화면을 불러오는 중...</div>}>
        <BookingView />
      </Suspense>
    ),
    fleet: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공용자원 예약을 불러오는 중...</div>}>
        <UniversalResourceCalendarView
          compact
          hideApprovalInbox
          hideMasterButton
          bookingMode="member"
          defaultCategory="vehicle"
        />
      </Suspense>
    ),
    grievances: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">노경 건의함을 불러오는 중...</div>}>
        <GrievanceListPage />
      </Suspense>
    ),
    'seat-rooms': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공간·좌석 현황을 불러오는 중...</div>}>
        <SeatRoomView />
      </Suspense>
    ),
    attendance: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">출결 화면을 불러오는 중...</div>}>
        <AttendanceView />
      </Suspense>
    ),
    passes: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">이용권 화면을 불러오는 중...</div>}>
        <PassesView />
      </Suspense>
    ),
    lockers: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사물함 화면을 불러오는 중...</div>}>
        <LockersView />
      </Suspense>
    ),
    consultations: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">상담 내역을 불러오는 중...</div>}>
        <ConsultationView />
      </Suspense>
    ),
    'billing-invoices': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">청구서 관리를 불러오는 중...</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    ledger: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">원장 내역을 불러오는 중...</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    wallets: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">크레딧 지갑을 불러오는 중...</div>}>
        {financeViewEntries.finance()}
      </Suspense>
    ),
    inventory: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">재고 화면을 불러오는 중...</div>}>
        <InventoryView />
      </Suspense>
    ),
    consents: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">안전 동의서 화면을 불러오는 중...</div>}>
        <SafetyConsentView />
      </Suspense>
    ),
    pipelines: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">작업 파이프라인 화면을 불러오는 중...</div>}>
        <TaskPipelineView />
      </Suspense>
    ),
    charts: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">시술 차트 화면을 불러오는 중...</div>}>
        <TreatmentChartView />
      </Suspense>
    ),
    rentals: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">장비 대여 화면을 불러오는 중...</div>}>
        <RentalEquipmentView />
      </Suspense>
    ),
    maintenance: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">시설 점검 화면을 불러오는 중...</div>}>
        <MaintenanceChecklistView />
      </Suspense>
    ),
    shifts: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">근무 시프트 화면을 불러오는 중...</div>}>
        <ShiftScheduleView />
      </Suspense>
    ),
    curriculum: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">학습 진도 화면을 불러오는 중...</div>}>
        <CurriculumProgressView />
      </Suspense>
    ),
    retention: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">리텐션 마케팅 화면을 불러오는 중...</div>}>
        <RetentionMarketingView />
      </Suspense>
    ),
    kds: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">주방 디스플레이를 불러오는 중...</div>}>
        <KitchenDisplaySystemView />
      </Suspense>
    ),
    'diet-body-log': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">식단·체성분 다이어리를 불러오는 중...</div>}>
        <DietBodyLogView />
      </Suspense>
    ),
    shuttle: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">안심통학·셔틀 화면을 불러오는 중...</div>}>
        <VehicleShuttleView />
      </Suspense>
    ),
    'commission-payroll': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">인센티브·정산 화면을 불러오는 중...</div>}>
        <CommissionPayrollView />
      </Suspense>
    ),
    'lost-found': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">분실물 관리 화면을 불러오는 중...</div>}>
        <LostFoundView />
      </Suspense>
    ),
    'recipe-bom': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">레시피 BOM 화면을 불러오는 중...</div>}>
        <RecipeBomView />
      </Suspense>
    ),
    contracts: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">전자계약 관리 화면을 불러오는 중...</div>}>
        <DigitalContractView />
      </Suspense>
    ),
    'seat-timers': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">시간제 타이머 화면을 불러오는 중...</div>}>
        <SeatTimerBillingView />
      </Suspense>
    ),
    portfolio: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">시술 포트폴리오 화면을 불러오는 중...</div>}>
        <TreatmentPortfolioView />
      </Suspense>
    ),
    'work-orders': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">정비 작업지시서 화면을 불러오는 중...</div>}>
        <WorkOrderKanbanView />
      </Suspense>
    ),
    'turn-queue': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">순번 대기 화면을 불러오는 중...</div>}>
        <WaitlistTurnQueueView />
      </Suspense>
    ),
    'deposit-escrow': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">예약 보증금 화면을 불러오는 중...</div>}>
        <DepositEscrowView />
      </Suspense>
    ),
    'equipment-lifecycle': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">장비 수명 주기 화면을 불러오는 중...</div>}>
        <EquipmentLifecycleView />
      </Suspense>
    ),
    'package-billing': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">복합 패키지 화면을 불러오는 중...</div>}>
        <PackageSplitBillingView />
      </Suspense>
    ),
    'grade-analytics': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">단원평가 분석 화면을 불러오는 중...</div>}>
        <ExamGradeAnalyticsView />
      </Suspense>
    ),
    'staff-call': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">직원 호출 화면을 불러오는 중...</div>}>
        <KioskStaffCallView />
      </Suspense>
    ),
    'family-tree': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">패밀리 그룹 화면을 불러오는 중...</div>}>
        <MembershipReferralTreeView />
      </Suspense>
    ),
    'hygiene-log': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">위생 점검 화면을 불러오는 중...</div>}>
        <HygieneHaccpLogView />
      </Suspense>
    ),
    'sop-risk': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">작업표준 화면을 불러오는 중...</div>}>
        <DesktopSopRiskMatrixView />
      </Suspense>
    ),
    'risk-approvals': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">결재 대기함을 불러오는 중...</div>}>
        <RiskApprovalInboxView />
      </Suspense>
    ),
    'vendor-ap': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공급처 및 매입 전표 화면을 불러오는 중...</div>}>
        <VendorApInvoiceView />
      </Suspense>
    ),
    'work-payroll': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">직원 근태 및 급여 화면을 불러오는 중...</div>}>
        <WorkAttendancePayrollView />
      </Suspense>
    ),
    'pickup-orders': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사전예약 픽업 칸반 화면을 불러오는 중...</div>}>
        <PickupOrdersKanbanView />
      </Suspense>
    ),
    'loyalty-stamps': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">전자 스탬프 화면을 불러오는 중...</div>}>
        <LoyaltyStampView />
      </Suspense>
    ),
    policies: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">매장 사규 관리 화면을 불러오는 중...</div>}>
        <WorkplacePolicyView />
      </Suspense>
    ),
    handover: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">교대 인수인계장을 불러오는 중...</div>}>
        <FeedbacksAndHandoverView />
      </Suspense>
    ),
    feedbacks: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">VOC 및 건의함을 불러오는 중...</div>}>
        <FeedbacksAndHandoverView />
      </Suspense>
    ),
    incidents: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">안전사고 감사 일지를 불러오는 중...</div>}>
        <FeedbacksAndHandoverView />
      </Suspense>
    ),
    'trial-funnel': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">체험·상담 파이프라인을 불러오는 중...</div>}>
        <TrialFunnelKanbanView />
      </Suspense>
    ),
    'learning-journal': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">수업 일지·알림장을 불러오는 중...</div>}>
        <LearningJournalFeedView />
      </Suspense>
    ),
    'level-assessment': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">승급 심사·합격증을 불러오는 중...</div>}>
        <LevelAssessmentView />
      </Suspense>
    ),
    'space-turnaround': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공간 턴어라운드를 불러오는 중...</div>}>
        <SpaceTurnaroundView />
      </Suspense>
    ),
    'supply-restock': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">소모품 안전재고를 불러오는 중...</div>}>
        <SupplyRestockView />
      </Suspense>
    ),
    'makeup-lesson-pass': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">결석 보강 매칭 화면을 불러오는 중...</div>}>
        <MakeupLessonPassView />
      </Suspense>
    ),
    'intake-assessment': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사전 문진표 화면을 불러오는 중...</div>}>
        <IntakeAssessmentView />
      </Suspense>
    ),
    'daily-care-report': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">일일 알림장 화면을 불러오는 중...</div>}>
        <DailyCareReportView />
      </Suspense>
    ),
    'substitute-dispatch': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">강사 대강 긴급호출 화면을 불러오는 중...</div>}>
        <SubstituteDispatchView />
      </Suspense>
    ),
    'entry-pass-ticket': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">일일 모바일 입장권 화면을 불러오는 중...</div>}>
        <EntryPassTicketView />
      </Suspense>
    ),
    'event-contest-hub': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">원내 발표회·대회 화면을 불러오는 중...</div>}>
        <EventContestHubView />
      </Suspense>
    ),
    'facility-incident-report': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">안전사고 대장 화면을 불러오는 중...</div>}>
        <FacilityIncidentReportView />
      </Suspense>
    ),
    'nps-survey-collector': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">만족도·NPS 설문 화면을 불러오는 중...</div>}>
        <NpsSurveyCollectorView />
      </Suspense>
    ),
    'achievement-quest-badge': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">성취 퀘스트 화면을 불러오는 중...</div>}>
        <AchievementQuestBadgeView />
      </Suspense>
    ),
    'parking-validator': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">무료주차 등록·정산 화면을 불러오는 중...</div>}>
        <ParkingValidatorView />
      </Suspense>
    ),
    'emergency-broadcast': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">긴급휴원·재난공지 화면을 불러오는 중...</div>}>
        <EmergencyAlertBroadcastView />
      </Suspense>
    ),
    'digital-guestbook': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">전자 방명록 화면을 불러오는 중...</div>}>
        <DigitalGuestbookView />
      </Suspense>
    ),
    mbo: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">목표관리(MBO) 화면을 불러오는 중...</div>}>
        <MboManagementView />
      </Suspense>
    ),
    'lab-projects': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">연구과제 화면을 불러오는 중...</div>}>
        <ResearchProjectManagementView />
      </Suspense>
    ),
    'research-projects': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">연구과제 화면을 불러오는 중...</div>}>
        <ResearchProjectManagementView />
      </Suspense>
    ),
    quality: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">품질 검사 대장을 불러오는 중...</div>}>
        <QualityInspectionManagementView />
      </Suspense>
    ),
    'change-management': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">4M 변경관리(ECN) 화면을 불러오는 중...</div>}>
        <ChangeManagementView />
      </Suspense>
    ),
    'patent-ip-asset': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">특허 및 직무발명 관리 화면을 불러오는 중...</div>}>
        <PatentAssetManagementView />
      </Suspense>
    ),
    'leave-management': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">휴가·연차 관리 화면을 불러오는 중...</div>}>
        <LeaveManagementDashboardView />
      </Suspense>
    ),
    capabilities: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사이드바 메뉴 표시 설정을 불러오는 중...</div>}>
        <CapabilitySwitchboardView />
      </Suspense>
    ),
    'menu-visibility': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">사이드바 메뉴 표시 설정을 불러오는 중...</div>}>
        <CapabilitySwitchboardView />
      </Suspense>
    ),
    dispatch: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">출장 파견 일정을 불러오는 중...</div>}>
        <DispatchListPage />
      </Suspense>
    ),
    'field-dispatch': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">출장 파견 일정을 불러오는 중...</div>}>
        <DispatchListPage />
      </Suspense>
    ),
    promotions: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">특가 프로모션을 불러오는 중...</div>}>
        <PromotionListPage />
      </Suspense>
    ),
    'promotional-deals': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">특가 프로모션을 불러오는 중...</div>}>
        <PromotionListPage />
      </Suspense>
    ),
    turnaround: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">공간 턴어라운드를 불러오는 중...</div>}>
        <SpaceTurnaroundView />
      </Suspense>
    ),
    waitlist: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">취소 대기열을 불러오는 중...</div>}>
        <WaitlistPage />
      </Suspense>
    ),
    'waitlist-queue': () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">취소 대기열을 불러오는 중...</div>}>
        <WaitlistPage />
      </Suspense>
    ),
    leads: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">체험·상담 리드 파이프라인을 불러오는 중...</div>}>
        <TrialFunnelKanbanView />
      </Suspense>
    ),
    ...Object.fromEntries(
      Object.entries(CAPABILITY_LIST_VIEWS).map(([tab, { View }]) => [
        tab,
        () => (
          <Suspense fallback={<div className="p-8 text-center text-slate-400">화면을 불러오는 중...</div>}>
            <View />
          </Suspense>
        ),
      ])
    ),
    ...financeViewEntries,
    settings: () => (
      <Suspense fallback={<div className="p-8 text-center text-slate-400">설정 화면을 불러오는 중...</div>}>
        <WorkplaceSettingsView />
      </Suspense>
    ),
    ...accountViewEntry,
  };

  const viewMap = externalViewMap || defaultViewMap;

  useEffect(() => {
    let candidateTab = urlTab;
    if (!candidateTab) {
      const parts = location.pathname.replace(/^\//, '').split('/');
      if (parts[0] === 'workspace' && parts[1]) {
        candidateTab = parts[1];
      } else if (parts[0] && parts[0] !== 'workspace') {
        candidateTab = parts[0];
      }
    }
    if (candidateTab) {
      setActiveTab(candidateTab);
    }
  }, [urlTab, location.pathname, setActiveTab]);

  const isCurrentTabAllowed = isTabAllowedForCapabilities(activeTab, enabledCaps);

  const renderViewContent = () => {
    const tabMeta = getTabMetadata(activeTab);

    if (!isCurrentTabAllowed) {
      return (
        <div className="max-w-xl mx-auto mt-10 p-6 sm:p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="disabled-feature-notice">
          <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold mb-2">
            <span>미활성화 기능</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-800">
            {tabMeta?.label || '현재 업종에서는 제공되지 않는 기능입니다'}
          </h2>
          <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            해당 기능이 활성화되지 않은 업종 프리셋입니다. 필요 시 워크스페이스 설정에서 기능을 추가하세요.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              대시보드로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
            >
              워크스페이스 설정
            </button>
          </div>
        </div>
      );
    }

    const viewRenderer = viewMap[activeTab];
    if (!viewRenderer) {
      // Capability는 활성화되어 있으나 화면 구현이 Tier 3(화면 연기)인 경우
      if (TAB_REQUIRED_CAPABILITIES[activeTab]) {
        return (
          <div className="max-w-xl mx-auto mt-10 p-6 sm:p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="deferred-feature-notice">
            <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50/80 text-indigo-700 rounded-full text-xs font-semibold mb-2">
              <span>Tier 3 · 화면 준비 중</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">
              {tabMeta?.label || '화면 준비 중인 기능입니다'}
            </h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              {tabMeta?.description ? `${tabMeta.description} — ` : ''}
              해당 기능({activeTab})의 백엔드 도메인 엔진 및 설정 스키마가 정상 활성화되어 있습니다. 전용 화면은 다음 릴리스에서 제공될 예정입니다.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                대시보드로 돌아가기
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                워크스페이스 설정
              </button>
            </div>
          </div>
        );
      }

      // 정의되지 않은 미등록 탭
      if (activeTab !== 'dashboard') {
        return (
          <div className="max-w-xl mx-auto mt-10 p-6 sm:p-8 text-center bg-white rounded-3xl border border-slate-200 shadow-xs" data-testid="not-found-notice">
            <div className="w-12 h-12 mx-auto mb-3.5 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-semibold mb-2">
              <span>미등록 경로</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800">페이지를 찾을 수 없습니다</h2>
            <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
              요청하신 경로({activeTab})는 존재하지 않거나 유효하지 않은 기능입니다.
            </p>
            <div className="mt-6 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
              >
                대시보드로 돌아가기
              </button>
            </div>
          </div>
        );
      }

      return viewMap.dashboard ? viewMap.dashboard() : null;
    }

    return viewRenderer();
  };

  const industryKey = currentOrganization?.industry_type || industry;
  const moduleId = resolveModuleIndustryId(industryKey);
  const moduleChrome = externalViewMap && moduleId ? getModuleChrome(moduleId) : null;
  const ChromeSidebar = moduleChrome?.Sidebar;
  const ChromeBottomNav = moduleChrome?.BottomNav;
  const useCorporateChrome = !externalViewMap && isCorporateChromePreset(industryKey);

  const corporateMainTabs = useMemo(() => {
    // 런처가 홈; 하단은 홈·사내 업무만 두고 결재/자재 등은 런처 딥링크로
    const preferred = ['dashboard', 'intranet-hub'] as const;
    const byTab = new Map(
      filteredSections.flatMap((s) => s.items).map((item) => [item.tab, item])
    );
    return preferred.map((tab) => byTab.get(tab)).filter(Boolean) as typeof filteredSections[0]['items'];
  }, [filteredSections]);

  const corporateMoreTabs = useMemo(() => {
    const mainSet = new Set(corporateMainTabs.map((t) => t.tab));
    return filteredSections
      .flatMap((s) => s.items)
      .filter((item) => !mainSet.has(item.tab))
      .map((item) => ({
        ...item,
        section: item.tab === 'settings' || item.tab === 'account' ? MORE_NAV_SECTION.settings : MORE_NAV_SECTION.manage,
      }));
  }, [filteredSections, corporateMainTabs]);

  const body = (
    <>
      {isOwner && <DirectorFloatingFab />}
      {Overlays && <Overlays />}
      {(enabledCaps.includes('sop_risk_assessment') || enabledCaps.includes('safety_consent')) && (
        <Suspense fallback={null}>
          <WorkerRepledgeHost />
        </Suspense>
      )}
      <PluginErrorBoundary pluginName={activeTab}>
        {renderViewContent()}
      </PluginErrorBoundary>
    </>
  );

  if (moduleChrome && ChromeSidebar && ChromeBottomNav) {
    return (
      <ModuleAppShell
        theme={moduleChrome.theme}
        omitHeader
        nested
        sidebar={<ChromeSidebar />}
        bottomNav={<ChromeBottomNav />}
      >
        {body}
      </ModuleAppShell>
    );
  }

  if (useCorporateChrome) {
    return (
      <ModuleAppShell
        theme="indigo"
        omitHeader
        nested
        sidebar={
          <ModuleSidebar
            theme="indigo"
            sections={filteredSections}
            activeTab={activeTab}
            onNavigate={navigateCorporateTab}
            user={{ name: currentUser.name, roleLabel, roleBadge }}
          />
        }
        bottomNav={
          <ModuleBottomNav
            theme="indigo"
            mainTabs={corporateMainTabs}
            moreTabs={corporateMoreTabs}
            activeTab={activeTab}
            onNavigate={navigateCorporateTab}
            moreMenuTitle="더보기"
            moreMenuDescription="맞춤 운영 도구 · 설정"
          />
        }
      >
        {body}
      </ModuleAppShell>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-5 max-w-full overflow-x-hidden">
      {body}
    </div>
  );
};

