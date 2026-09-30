import React from "react";
import { Link } from "react-router-dom";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { LogOut, User, Bell, Building2 } from "lucide-react";
import { useOrganization } from "@/core/organizations/OrganizationProvider";

export const Header: React.FC = () => {
  const { data: user } = useGetIdentity<{ name?: string; email?: string }>();
  const { mutate: logout } = useLogout();
  const { currentOrganization, clearOrganization } = useOrganization();

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
            {user?.name || user?.email || "관리자"}
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

