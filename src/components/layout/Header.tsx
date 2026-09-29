import React from "react";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { LogOut, User, Bell } from "lucide-react";

export const Header: React.FC = () => {
  const { data: user } = useGetIdentity<{ name?: string; email?: string }>();
  const { mutate: logout } = useLogout();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white shadow-sm">
          M
        </div>
        <span className="text-lg font-semibold tracking-tight text-slate-900">
          MOA <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">v2</span>
        </span>
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
