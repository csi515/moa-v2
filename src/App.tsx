import React, { useMemo } from "react";
import { Refine, Authenticated } from "@refinedev/core";
import routerBindings, {
  CatchAllNavigate,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BrowserRouter, Route, Routes, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Users, Calendar, CreditCard, LayoutDashboard } from "lucide-react";

import { AuthProvider } from "@/core/auth/AuthProvider";
import { OrganizationProvider, useOrganization } from "@/core/organizations/OrganizationProvider";
import { AppProvider } from "@/context/AppContext";
import { SupabaseRoleSync } from "@/SupabaseRoleSync";
import { SupabaseAppGate } from "@/SupabaseAppGate";
import { IndustryAppRouter } from "@/app/industry/IndustryAppRouter";
import { provisionIndustryResources } from "@/app/industry/resourceProvisioner";
import { registerQueryClientClear } from "@/core/auth/services/signOutCoordinator";

import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";
import { notificationProvider } from "./providers/notificationProvider";
import { createI18nProvider } from "./providers/i18nProvider";
import { liveProvider } from "./providers/liveProvider";
import { ToastContainer, ConfirmDialog } from "@/shared/components";

import { Header } from "./components/layout/Header";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/dashboard";
import {
  StudentListPage,
  StudentCreatePage,
  StudentShowPage,
  StudentEditPage,
} from "./pages/students";
import { WeeklyTimetableView } from "@/capabilities/scheduling";
import { TuitionManagementView } from "@/capabilities/billing";
import { LoginPage } from "./pages/auth/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

registerQueryClientClear(() => {
  queryClient.clear();
});

const RefineApp: React.FC = () => {
  const { currentOrganization } = useOrganization();
  const industryType = currentOrganization?.industry_type;

  const currentI18nProvider = useMemo(() => {
    return createI18nProvider({
      defaultIndustry: industryType,
      getIndustry: () => industryType,
    });
  }, [industryType]);

  const resources = useMemo(() => {
    return provisionIndustryResources({
      industry: industryType,
      i18n: currentI18nProvider,
    });
  }, [industryType, currentI18nProvider]);

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
          {/* 사업장 업종 메인 워크스페이스 화면 */}
          <Route index element={<IndustryAppRouter />} />
          <Route path="/workspace" element={<IndustryAppRouter />} />
          <Route path="/workspace/:tab" element={<IndustryAppRouter />} />

          {/* Refine 관리 리소스 레이아웃 */}
          <Route
            element={
              <div className="flex min-h-screen flex-col">
                <Header />
                <Layout>
                  <Outlet />
                </Layout>
                <ConfirmDialog />
                <ToastContainer />
              </div>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/create" element={<StudentCreatePage />} />
            <Route path="/students/:id" element={<StudentShowPage />} />
            <Route path="/students/:id/edit" element={<StudentEditPage />} />
            <Route path="/schedules" element={<WeeklyTimetableView />} />
            <Route path="/billing" element={<TuitionManagementView />} />
          </Route>
        </Route>

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
        </Route>
      </Routes>
      <UnsavedChangesNotifier />
    </Refine>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <AppProvider>
            <SupabaseRoleSync />
            <BrowserRouter>
              <RefineApp />
            </BrowserRouter>
          </AppProvider>
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
