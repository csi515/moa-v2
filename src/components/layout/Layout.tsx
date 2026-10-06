import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMenu } from "@refinedev/core";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { menuItems } = useMenu();

  const navigationItems = useMemo(() => {
    const items = [
      {
        name: "업종 워크스페이스",
        href: "/",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
    ];

    for (const item of menuItems) {
      if (!item.route || item.route === "/") continue;
      items.push({
        name: item.label || item.name || "",
        href: item.route,
        icon: (item.icon as React.ReactElement) || <LayoutDashboard className="h-5 w-5" />,
      });
    }

    return items;
  }, [menuItems]);

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className={cn(isActive ? "text-indigo-600" : "text-slate-400")}>
                {item.icon}
              </span>
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
