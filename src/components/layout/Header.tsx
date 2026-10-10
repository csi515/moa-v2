import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { LogOut, User, Bell, Building2, Ticket, ArrowLeftRight } from "lucide-react";
import { useOrganization } from "@/core/organizations/OrganizationProvider";
import { getIndustryLabel } from "@/core/industry/types";

export const Header: React.FC = () => {
  const { data: user } = useGetIdentity<{ name?: string; email?: string }>();
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentOrganization,
    clearOrganization,
    canAccessCustomerPortal,
    customerPortalActive,
    enterCustomerPortal,
    exitCustomerPortal,
  } = useOrganization();

  const isCustomerView = customerPortalActive || location.pathname.startsWith("/customer");

  const handleToggleMode = () => {
    if (isCustomerView) {
      exitCustomerPortal();
      navigate("/workspace");
    } else {
      enterCustomerPortal();
      navigate("/customer/pass");
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm">
            M
          </div>
          <span className="text-lg font-semibold tracking-tight text-slate-900">
            MOA <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">v2</span>
          </span>
        </Link>
        {currentOrganization && (
          <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              {currentOrganization.name}
            </span>
            <span className="hidden sm:inline-block text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2 py-0.5 rounded-md">
              {getIndustryLabel(currentOrganization.industry_type)}
            </span>
            <button
              type="button"
              onClick={() => clearOrganization()}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
              title="사업장 변경"
            >
              변경
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* 복합 권한(사업주+고객) 보유 시 모드 전환 토글 버튼 */}
        {canAccessCustomerPortal && (
          <button
            type="button"
            onClick={handleToggleMode}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-xs"
            title={isCustomerView ? "사업주 운영 모드로 전환" : "고객 이용권 모드로 전환"}
          >
            {isCustomerView ? (
              <>
                <ArrowLeftRight className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">사업주 모드로 전환</span>
                <span className="sm:hidden">사업주 모드</span>
              </>
            ) : (
              <>
                <Ticket className="h-3.5 w-3.5 text-indigo-600" />
                <span className="hidden sm:inline">고객 모드로 전환</span>
                <span className="sm:hidden">고객 모드</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          title="알림"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium text-slate-700 sm:inline-block">
            {user?.name || user?.email || "사업자"}
          </span>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
            title="로그아웃"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

