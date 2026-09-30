import React from "react";
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
import { OrganizationProvider } from "@/core/organizations/OrganizationProvider";
import { AppProvider } from "@/context/AppContext";
import { SupabaseRoleSync } from "@/SupabaseRoleSync";
import { SupabaseAppGate } from "@/SupabaseAppGate";
import { IndustryAppRouter } from "@/app/industry/IndustryAppRouter";

import { authProvider } from "./providers/authProvider";
import { accessControlProvider } from "./providers/accessControlProvider";
import { dataProvider } from "./providers/dataProvider";

import { Header } from "./components/layout/Header";
import { Layout } from "./components/layout/Layout";
import { DashboardPage } from "./pages/dashboard";
import { StudentListPage } from "./pages/students";
import { LoginPage } from "./pages/auth/LoginPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OrganizationProvider>
          <AppProvider>
            <SupabaseRoleSync />
            <BrowserRouter>
              <Refine
                dataProvider={dataProvider}
                authProvider={authProvider}
                accessControlProvider={accessControlProvider}
                routerProvider={routerBindings}
                resources={[
                  {
                    name: "dashboard",
                    list: "/",
                    meta: {
                      label: "대시보드",
                      icon: <LayoutDashboard className="h-4 w-4" />,
                    },
                  },
                  {
                    name: "customers",
                    list: "/students",
                    meta: {
                      label: "원생 관리",
                      icon: <Users className="h-4 w-4" />,
                    },
                  },
                  {
                    name: "schedules",
                    list: "/schedules",
                    meta: {
                      label: "출석/수업",
                      icon: <Calendar className="h-4 w-4" />,
                    },
                  },
                  {
                    name: "tuition_invoices",
                    list: "/billing",
                    meta: {
                      label: "수강료/결제",
                      icon: <CreditCard className="h-4 w-4" />,
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
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

                    {/* Refine 관리 리소스 레이아웃 */}
                    <Route
                      element={
                        <div className="flex min-h-screen flex-col">
                          <Header />
                          <Layout>
                            <Outlet />
                          </Layout>
                        </div>
                      }
                    >
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/students" element={<StudentListPage />} />
                      <Route path="/schedules" element={<DashboardPage />} />
                      <Route path="/billing" element={<DashboardPage />} />
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
            </BrowserRouter>
          </AppProvider>
        </OrganizationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

