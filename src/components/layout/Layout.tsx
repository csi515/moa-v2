import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Users, Calendar, CreditCard, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navigationItems = [
  { name: "업종 워크스페이스", href: "/", icon: LayoutDashboard },
  { name: "원생 관리", href: "/students", icon: Users },
  { name: "출석/수업", href: "/schedules", icon: Calendar },
  { name: "수강료/결제", href: "/billing", icon: CreditCard },
  { name: "운영 대시보드", href: "/dashboard", icon: LayoutDashboard },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive ? "text-indigo-600" : "text-slate-400")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
};
