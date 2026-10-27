import React, { lazy, Suspense, useMemo } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, {
  CatchAllNavigate,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Route, Routes, Outlet, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Ticket, Lock } from "lucide-react";

import { InPlaceReAuthModal } from "@/components/auth/InPlaceReAuthModal";
import { installAuthInterceptor } from "@/providers/authInterceptor";
import { AuthProvider } from "@/core/auth/AuthProvider";
import { OrganizationProvider, useOrganization } from "@/core/organizations/OrganizationProvider";
import { AppProvider } from "@/context/AppContext";
import { SupabaseRoleSync } from "@/SupabaseRoleSync";
import { SupabaseAppGate } from "@/SupabaseAppGate";
import { AppBootstrapGate } from "@/core/application/AppBootstrapGate";
import { IndustryAppRouter } from "@/app/industry/IndustryAppRouter";
import { provisionIndustryResources } from "@/app/industry/resourceProvisioner";
import "@/app/presets/presetManualEngine";
import { registerQueryClientClear } from "@/core/auth/services/signOutCoordinator";
import { setTenantQueryClient } from "@/core/query/tenantQueryKeys";
import { setupStorageToQueryBridge } from "@/core/query/crossCacheBridge";
import { getStoredOrganizationId } from "@/core/organizations/services/organizationService";

import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";
import { notificationProvider } from "./providers/notificationProvider";
import { createI18nProvider } from "./providers/i18nProvider";
import { liveProvider } from "./providers/liveProvider";
import { ToastContainer, ConfirmDialog, AppErrorBoundary } from "@/shared/components";
import { LoadingScreen } from "@/shared/components/LoadingScreen";

import { DynamicRoleSettingsPage, FinanceRouteGate } from "@/pages/settings/DynamicRoleSettingsPage";
import { ConsentSignatureModal } from "@/capabilities/safety_consent/ui/ConsentSignatureModal";
import { Header } from "./components/layout/Header";
import { Layout } from "./components/layout/Layout";
import { LoginPage } from "./pages/auth/LoginPage";
import { AuthPage } from "./core/auth/AuthPage";
import { SuperAdminGuard } from "./pages/admin/SuperAdminGuard";
import { ImpersonationFloatingBanner } from "./components/layout/ImpersonationFloatingBanner";
// E2E 전용 /e2e/shuttle-commute 라우트가 즉시 렌더링을 가정하므로 eager import 유지
import { VehicleShuttleCommuteView } from "@/capabilities/vehicle_shuttle/ui/VehicleShuttleCommuteView";

// 라우트 단위 코드 스플리팅: 초기 번들에서 부가 화면을 분리한다.
const VehicleShuttleManagementView = lazy(() => import("@/capabilities/vehicle_shuttle/components/VehicleShuttleManagementView").then((m) => ({ default: m.VehicleShuttleManagementView })));
const MemberList = lazy(() => import("@/pages/members/MemberList").then((m) => ({ default: m.MemberList })));
const AttendanceKioskPage = lazy(() => import("@/capabilities/attendance/ui/AttendanceKioskPage").then((m) => ({ default: m.AttendanceKioskPage })));
const ScheduleCalendarPage = lazy(() => import("@/capabilities/booking/pages/ScheduleCalendarPage").then((m) => ({ default: m.ScheduleCalendarPage })));
const MemberBookingView = lazy(() => import("@/capabilities/booking/pages/MemberBookingView").then((m) => ({ default: m.MemberBookingView })));
const DashboardPage = lazy(() => import("./pages/dashboard").then((m) => ({ default: m.DashboardPage })));
const StudentListPage = lazy(() => import("./pages/students").then((m) => ({ default: m.StudentListPage })));
const StudentCreatePage = lazy(() => import("./pages/students").then((m) => ({ default: m.StudentCreatePage })));
const StudentShowPage = lazy(() => import("./pages/students").then((m) => ({ default: m.StudentShowPage })));
const StudentEditPage = lazy(() => import("./pages/students").then((m) => ({ default: m.StudentEditPage })));
const ClaimTokenPage = lazy(() => import("./pages/customer/ClaimTokenPage").then((m) => ({ default: m.ClaimTokenPage })));
const CustomerSignUpFlow = lazy(() => import("@/core/customer/CustomerSignUpFlow").then((m) => ({ default: m.CustomerSignUpFlow })));
const MyPassView = lazy(() => import("./pages/customer/MyPassView").then((m) => ({ default: m.MyPassView })));
const RolesPage = lazy(() => import("./pages/settings/RolesPage").then((m) => ({ default: m.RolesPage })));
const AcceptStaffInvitePage = lazy(() => import("./pages/invite/AcceptStaffInvitePage").then((m) => ({ default: m.AcceptStaffInvitePage })));
const QuickSetupPage = lazy(() => import("./pages/onboarding/QuickSetupPage").then((m) => ({ default: m.QuickSetupPage })));
const OrganizationTreePage = lazy(() => import("./pages/organization/OrganizationTreePage").then((m) => ({ default: m.OrganizationTreePage })));
const WorkspaceResourcesPage = lazy(() => import("./pages/workspace/WorkspaceResourcesPage").then((m) => ({ default: m.WorkspaceResourcesPage })));
const WorkspaceFeedbacksPage = lazy(() => import("./pages/workspace/WorkspaceFeedbacksPage").then((m) => ({ default: m.WorkspaceFeedbacksPage })));
const RndPortalPage = lazy(() => import("./pages/workspace/RndPortalPage").then((m) => ({ default: m.RndPortalPage })));
const WorkspaceIntranetHubPage = lazy(() => import("./pages/workspace/WorkspaceIntranetHubPage").then((m) => ({ default: m.WorkspaceIntranetHubPage })));
const WorkspaceMboPage = lazy(() => import("./pages/workspace/WorkspaceMboPage").then((m) => ({ default: m.WorkspaceMboPage })));
const WorkspaceApprovalsPage = lazy(() => import("./pages/workspace/WorkspaceApprovalsPage").then((m) => ({ default: m.WorkspaceApprovalsPage })));
const WorkspaceInventoryPage = lazy(() => import("./pages/workspace/WorkspaceInventoryPage").then((m) => ({ default: m.WorkspaceInventoryPage })));
const WorkspaceSupplyRestockPage = lazy(() => import("./pages/workspace/WorkspaceSupplyRestockPage").then((m) => ({ default: m.WorkspaceSupplyRestockPage })));
const WorkspaceSopRiskPage = lazy(() => import("./pages/workspace/WorkspaceSopRiskPage").then((m) => ({ default: m.WorkspaceSopRiskPage })));
const WorkspaceShuttleMyPage = lazy(() => import("./pages/workspace/WorkspaceShuttlePage").then((m) => ({ default: m.WorkspaceShuttleMyPage })));
const WorkspaceShuttleRosterPage = lazy(() => import("./pages/workspace/WorkspaceShuttlePage").then((m) => ({ default: m.WorkspaceShuttleRosterPage })));
const WorkspaceShuttleRoutesPage = lazy(() => import("./pages/workspace/WorkspaceShuttlePage").then((m) => ({ default: m.WorkspaceShuttleRoutesPage })));
const WorkspaceVolunteerListPage = lazy(() => import("./pages/workspace/WorkspaceVolunteerPage").then((m) => ({ default: m.WorkspaceVolunteerListPage })));
const WorkspaceVolunteerManagePage = lazy(() => import("./pages/workspace/WorkspaceVolunteerPage").then((m) => ({ default: m.WorkspaceVolunteerManagePage })));
const WorkspaceMealSurveyMyPage = lazy(() => import("./pages/workspace/WorkspaceMealSurveyPage").then((m) => ({ default: m.WorkspaceMealSurveyMyPage })));
const WorkspaceMealSurveyManagePage = lazy(() => import("./pages/workspace/WorkspaceMealSurveyPage").then((m) => ({ default: m.WorkspaceMealSurveyManagePage })));
const WorkspaceMealSurveySettingsPage = lazy(() => import("./pages/workspace/WorkspaceMealSurveyPage").then((m) => ({ default: m.WorkspaceMealSurveySettingsPage })));
const WorkspaceOfficeSupplyMyPage = lazy(() => import("./pages/workspace/WorkspaceOfficeSupplyPage").then((m) => ({ default: m.WorkspaceOfficeSupplyMyPage })));
const WorkspaceOfficeSupplyManagePage = lazy(() => import("./pages/workspace/WorkspaceOfficeSupplyPage").then((m) => ({ default: m.WorkspaceOfficeSupplyManagePage })));
const WorkspaceOfficeSupplyCatalogPage = lazy(() => import("./pages/workspace/WorkspaceOfficeSupplyPage").then((m) => ({ default: m.WorkspaceOfficeSupplyCatalogPage })));
const WorkspaceHazardousSubstancesPage = lazy(() => import("./pages/workspace/WorkspaceHazardousSubstancesPage").then((m) => ({ default: m.WorkspaceHazardousSubstancesPage })));
const WorkspaceVehicleMileagePage = lazy(() => import("./pages/workspace/WorkspaceVehicleMileagePage").then((m) => ({ default: m.WorkspaceVehicleMileagePage })));
const EpZeroSetupWizard = lazy(() => import("./pages/onboarding/EpZeroSetupWizard").then((m) => ({ default: m.EpZeroSetupWizard })));
const WorkspaceSafetyPermitsPage = lazy(() => import("./pages/workspace/WorkspaceSafetyPermitsPage").then((m) => ({ default: m.WorkspaceSafetyPermitsPage })));
const PassesListPage = lazy(() => import("./pages/passes/list").then((m) => ({ default: m.PassesListPage })));
const LockersGridPage = lazy(() => import("./pages/lockers/grid").then((m) => ({ default: m.LockersGridPage })));
const PublicStoreLandingPage = lazy(() => import("./pages/public/PublicStoreLandingPage").then((m) => ({ default: m.PublicStoreLandingPage })));
const WeeklyTimetableView = lazy(() => import("@/capabilities/scheduling").then((m) => ({ default: m.WeeklyTimetableView })));
const TuitionManagementView = lazy(() => import("@/capabilities/billing").then((m) => ({ default: m.TuitionManagementView })));
const SuperAdminTenantsPage = lazy(() => import("./pages/admin/SuperAdminTenantsPage").then((m) => ({ default: m.SuperAdminTenantsPage })));
const LegalPageView = lazy(() => import("@/core/legal").then((m) => ({ default: m.LegalPageView })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

setTenantQueryClient(queryClient);
setupStorageToQueryBridge(queryClient, () => getStoredOrganizationId());

registerQueryClientClear(() => {
  queryClient.clear();
});

const CAPABILITY_ROUTE_PATHS = [
  // 범주 5대 기본 & A~AV 전체 Capability 엔드포인트
  "attendance",
  "bookings",
  "seat-rooms",
  "rentals",
  "maintenance",
  "instructors",
  "shifts",
  "pipelines",
  "billing-invoices",
  "ledger",
  "wallets",
  "consultations",
  "charts",
  "consents",
  "inventory",
  "policies",
  "settings/policies",
  "operations",
  "operations/handover",
  "operations/feedbacks",
  "operations/incidents",
  "handover",
  "feedbacks",
  "incidents",
  "trial-funnel",
  "learning-journal",
  "level-assessment",
  "space-turnaround",
  "supply-restock",
  "makeup-lesson-pass",
  "intake-assessment",
  "daily-care-report",
  "substitute-dispatch",
  "entry-pass-ticket",
  "event-contest-hub",
  "facility-incident-report",
  "facility-incidents",
  "nps-survey-collector",
  "nps-surveys",
  "achievement-quest-badge",
  "achievement-quests",
  "parking-validator",
  "parking-registrations",
  "emergency-broadcast",
  "emergency-broadcasts",
  "digital-guestbook",
  "curriculum",
  "commission-payroll",
  "deposit-escrow",
  "diet-body-log",
  "contracts",
  "equipment-lifecycle",
  "grade-analytics",
  "hygiene-log",
  "staff-call",
  "lost-found",
  "loyalty-stamps",
  "family-tree",
  "package-billing",
  "pickup-orders",
  "recipe-bom",
  "retention",
  "seat-timers",
  "sop-risk",
  "kds",
  "portfolio",
  "shuttle",
  "vendor-ap",
  "turn-queue",
  "work-payroll",
  "work-orders",
  "dispatch",
  "promotions",
  "promotional-deals",
  "turnaround",
  "waitlist",
  "leads",
  // capability 번들 list 경로 (GenericIndustryShell CAPABILITY_LIST_VIEWS로 렌더)
  "patents",
  "patent-inventors",
  "research-projects",
  "research-project-gates",
  "research-project-deliverables",
  "leave-balances",
  "leave-requests",
  "pos-reconciliations",
  "rfid-cards",
  "valet-custody",
  "coatroom-baggage",
  "locker-overrides",
  "sound-broadcasts",
  "certificates",
  "blacklist-guard",
  "supervision-audits",
  "privacy-audits",
  "sublease-contracts",
  "calibration-devices",
  "access-keys",
  "hazardous-waste",
  "consumable-dispenser",
  "utility-meters",
  "staff-onboardings",
  "skills-matrix",
  "whistleblower-grievances",
  "uniform-gear",
  "petty-cash",
  "tax-withholdings",
  "profit-share",
  "warranty-claims",
  "custom-orders",
  "media-assets",
  "art-exhibitions",
  "vip-profiles",
  "study-groups",
  "mentoring-pairs",
  "pl-cashflows",
  "fixed-assets",
  "procurement-3way",
  "fefo-lots",
  "budget-ceilings",
  "audit-trails",
  "vendor-scorecards",
  "hazardous-substances",
  "chemical-usage-logs",
  "electronic-lab-notebooks",
  "lab-notebook-signatures",
  "vehicle-mileage-logs",
  "safety-work-permits",
  "baby-food",
  "baby-food/settlement",
] as const;

const RefineApp: React.FC = () => {
  const { currentOrganization, activeCapabilities, hiddenCapabilities } = useOrganization();
  const industryType = currentOrganization?.industry_type;

  const currentI18nProvider = useMemo(() => {
    return createI18nProvider({
      defaultIndustry: industryType,
      getIndustry: () => industryType,
    });
  }, [industryType]);

  const resources = useMemo(() => {
    const base = provisionIndustryResources({
      industry: industryType,
      i18n: currentI18nProvider,
      activeCapabilities,
      hiddenCapabilities,
    });
    const existingNames = new Set(base.map((r) => r.name));
    const extra: typeof base = [];
    if (!existingNames.has("passes")) {
      extra.push({
        name: "passes",
        list: "/passes",
        meta: {
          label: "이용권/회원권",
          icon: React.createElement(Ticket, { className: "h-4 w-4" }),
        },
      });
    }
    if (!existingNames.has("lockers")) {
      extra.push({
        name: "lockers",
        list: "/lockers",
        meta: {
          label: "사물함/락커",
          icon: React.createElement(Lock, { className: "h-4 w-4" }),
        },
      });
    }
    return [...base, ...extra];
  }, [industryType, currentI18nProvider, activeCapabilities, hiddenCapabilities]);

  return (
    <Refine
      dataProvider={dataProvider}
      authProvider={authProvider}
      accessControlProvider={accessControlProvider}
      notificationProvider={notificationProvider}
      i18nProvider={currentI18nProvider}
      liveProvider={liveProvider}
      routerProvider={routerBindings}
      resources={resources}
      options={{
        syncWithLocation: true,
        warnWhenUnsavedChanges: true,
        liveMode: "auto",
      }}
    >
      <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route
          element={
            <Authenticated
              key="authenticated-routes"
              fallback={<CatchAllNavigate to="/login" />}
            >
              <SupabaseAppGate>
                <Outlet />
              </SupabaseAppGate>
            </Authenticated>
          }
        >
          <Route path="/kiosk/attendance" element={<AttendanceKioskPage />} />
          {/* 사업장 업종 메인 워크스페이스 화면 */}
          

          {/* 최고 관리자(개발자) 전용 테넌트 종합 관제 콘솔 */}
          <Route
            path="/admin/tenants"
            element={
              <SuperAdminGuard>
                <SuperAdminTenantsPage />
              </SuperAdminGuard>
            }
          />

          {/* Refine 관리 리소스 레이아웃 */}
          <Route
            element={
              <AppErrorBoundary>
                <div className="flex h-dvh min-h-[100svh] flex-col">
                  <ImpersonationFloatingBanner />
                  <Header />
                  <div className="flex min-h-0 flex-1 flex-col">
                    <Layout>
                      <Suspense fallback={<LoadingScreen message="화면을 불러오는 중..." />}>
                        <Outlet />
                      </Suspense>
                    </Layout>
                  </div>
                  <ConfirmDialog />
                  <ToastContainer />
                </div>
              </AppErrorBoundary>
            }
          >
            <Route index element={<IndustryAppRouter />} />
            <Route path="/workspace/settings/roles" element={<DynamicRoleSettingsPage />} />
            <Route path="/workspace/members" element={<MemberList />} />
            <Route path="/workspace/organization" element={<OrganizationTreePage />} />
            <Route path="/workspace/intranet" element={<WorkspaceIntranetHubPage />} />
            <Route path="/workspace/resources" element={<WorkspaceResourcesPage />} />
            <Route path="/workspace/feedbacks" element={<WorkspaceFeedbacksPage />} />
            <Route path="/workspace/mbo" element={<WorkspaceMboPage />} />
            <Route path="/workspace/approvals" element={<WorkspaceApprovalsPage />} />
            <Route path="/workspace/inventory" element={<WorkspaceInventoryPage />} />
            <Route path="/workspace/supply-restock" element={<WorkspaceSupplyRestockPage />} />
            <Route path="/workspace/shuttle/routes" element={<WorkspaceShuttleRoutesPage />} />
            <Route path="/workspace/shuttle/roster" element={<WorkspaceShuttleRosterPage />} />
            <Route path="/workspace/shuttle/my" element={<WorkspaceShuttleMyPage />} />
            <Route path="/workspace/sop-risk" element={<WorkspaceSopRiskPage />} />
            <Route path="/workspace/volunteer" element={<WorkspaceVolunteerListPage />} />
            <Route path="/workspace/volunteer/manage" element={<WorkspaceVolunteerManagePage />} />
            <Route path="/workspace/meal-survey" element={<WorkspaceMealSurveyMyPage />} />
            <Route path="/workspace/meal-survey/manage" element={<WorkspaceMealSurveyManagePage />} />
            <Route path="/workspace/meal-survey/settings" element={<WorkspaceMealSurveySettingsPage />} />
            <Route path="/workspace/office-supply" element={<WorkspaceOfficeSupplyMyPage />} />
            <Route path="/workspace/office-supply/manage" element={<WorkspaceOfficeSupplyManagePage />} />
            <Route path="/workspace/office-supply/catalog" element={<WorkspaceOfficeSupplyCatalogPage />} />
            <Route path="/workspace/hazardous-substances" element={<WorkspaceHazardousSubstancesPage />} />
            <Route path="/workspace/vehicle-mileage" element={<WorkspaceVehicleMileagePage />} />
            <Route path="/workspace/safety-permits" element={<WorkspaceSafetyPermitsPage />} />
            <Route path="/workspace/setup-wizard" element={<EpZeroSetupWizard />} />
            <Route path="/onboarding/ep-setup" element={<EpZeroSetupWizard />} />
            <Route path="/rnd" element={<RndPortalPage />} />
            <Route path="/rnd_workspace" element={<Navigate to="/rnd" replace />} />
            <Route path="/workspace" element={<IndustryAppRouter />} />
            <Route path="/workspace/:tab" element={<IndustryAppRouter />} />
            <Route path="/dashboard" element={<Navigate to="/workspace" replace />} />
            {/* Roster / Customers 범용 중립 경로 및 하위 호환 /students 경로 */}
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/create" element={<StudentCreatePage />} />
            <Route path="/students/:id" element={<StudentShowPage />} />
            <Route path="/students/:id/edit" element={<StudentEditPage />} />
            <Route path="/customers" element={<StudentListPage />} />
            <Route path="/customers/create" element={<StudentCreatePage />} />
            <Route path="/customers/:id" element={<StudentShowPage />} />
            <Route path="/customers/:id/edit" element={<StudentEditPage />} />
            <Route path="/roster" element={<StudentListPage />} />
            <Route path="/roster/create" element={<StudentCreatePage />} />
            <Route path="/roster/:id" element={<StudentShowPage />} />
            <Route path="/roster/:id/edit" element={<StudentEditPage />} />

            <Route path="/schedules" element={<WeeklyTimetableView />} />
            <Route path="/booking/week" element={<ScheduleCalendarPage />} />
            <Route path="/billing" element={<FinanceRouteGate><TuitionManagementView /></FinanceRouteGate>} />
            <Route path="/customer/pass" element={<><MyPassView /><ConsentSignatureModal /></>} />
            <Route path="/customer/booking" element={<MemberBookingView />} />
            <Route path="/passes" element={<PassesListPage />} />
            <Route path="/lockers" element={<LockersGridPage />} />
            <Route path="/settings/roles" element={<RolesPage />} />
            <Route path="/onboarding/quick" element={<QuickSetupPage />} />
            <Route path="/workspace" element={<IndustryAppRouter />} />
            <Route path="/workspace/*" element={<IndustryAppRouter />} />

            {/* Capability 동적 리소스 경로 선언적 라우트 매핑 (Refine 사이드바 연동) */}
            {CAPABILITY_ROUTE_PATHS.map((path) => (
              <React.Fragment key={path}>
                <Route path={`/${path}`} element={<IndustryAppRouter />} />
                <Route path={`/${path}/*`} element={<IndustryAppRouter />} />
              </React.Fragment>
            ))}
          </Route>
        </Route>

        {import.meta.env.VITE_E2E === "1" ? (
          <>
            <Route path="/e2e/shuttle" element={<VehicleShuttleManagementView />} />
            <Route path="/e2e/shuttle-commute" element={<VehicleShuttleCommuteView />} />
          </>
        ) : null}
        <Route path="/p/:slug" element={<PublicStoreLandingPage />} />
        <Route path="/claim/:token" element={<ClaimTokenPage />} />
        <Route path="/invite/staff/:token" element={<AcceptStaffInvitePage />} />
        <Route path="/signup/customer" element={<CustomerSignUpFlow />} />
        <Route path="/terms" element={<LegalPageView page="terms" />} />
        <Route path="/privacy" element={<LegalPageView page="privacy" />} />
        <Route path="/support" element={<LegalPageView page="support" />} />

        <Route
          element={
            <Authenticated
              key="unauthenticated-routes"
              fallback={<Outlet />}
            >
              <NavigateToResource />
            </Authenticated>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<AuthPage />} />
        </Route>
      </Routes>
      </Suspense>
      <UnsavedChangesNotifier />
    </Refine>
  );
};

export const App: React.FC = () => {
  React.useEffect(() => {
    installAuthInterceptor();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OrganizationProvider>
            <AppProvider>
              <SupabaseRoleSync />
              <InPlaceReAuthModal />
              <AppBootstrapGate>
                <RefineApp />
              </AppBootstrapGate>
            </AppProvider>
          </OrganizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
