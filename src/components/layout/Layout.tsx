import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useMenu } from "@refinedev/core";
import { LayoutDashboard } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { MobileBottomDock } from "./MobileBottomDock";
import { OmniSearchModal } from "@/core/search/components/OmniSearchModal";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { KeyboardShortcutsModal } from "@/core/platform/KeyboardShortcutsModal";
import { useOptionalOrganization } from "@/core/organizations/OrganizationProvider";
import { shouldUseModuleChrome } from "@/app/industry/resolveModuleIndustry";
import { getIndustryPreset } from "@/app/presets/presetRegistry";

const THEME_ACTIVE_NAV_STYLES: Record<string, { bg: string; icon: string }> = {
  emerald: { bg: "bg-emerald-50 text-emerald-800 font-semibold", icon: "text-emerald-600" },
  rose: { bg: "bg-rose-50 text-rose-800 font-semibold", icon: "text-rose-600" },
  orange: { bg: "bg-orange-50 text-orange-800 font-semibold", icon: "text-orange-600" },
  amber: { bg: "bg-amber-50 text-amber-800 font-semibold", icon: "text-amber-600" },
  sky: { bg: "bg-sky-50 text-sky-800 font-semibold", icon: "text-sky-600" },
  teal: { bg: "bg-teal-50 text-teal-800 font-semibold", icon: "text-teal-600" },
  purple: { bg: "bg-slate-50 text-purple-800 font-semibold", icon: "text-slate-800" },
  slate: { bg: "bg-slate-100 text-slate-900 font-semibold", icon: "text-slate-700" },
  indigo: { bg: "bg-slate-50 text-slate-700 font-semibold", icon: "text-slate-800" },
};

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { menuItems } = useMenu();
  const org = useOptionalOrganization();
  const currentOrg = org?.currentOrganization;
  const preset = currentOrg?.industry_type ? getIndustryPreset(currentOrg.industry_type) : null;
  const accent = preset?.theme?.accentColor || "indigo";
  const activeStyle = THEME_ACTIVE_NAV_STYLES[accent] || THEME_ACTIVE_NAV_STYLES.indigo;

  const navigationItems = useMemo(() => {
    const items = [
      {
        name: "업종 워크스페이스",
        href: "/",
        icon: <LayoutDashboard className="h-5 w-5" />,
      },
    ];

    if (menuItems) {
      menuItems.forEach((item) => {
        if (item.route && item.name) {
          items.push({
            name: item.name,
            href: item.route,
            icon: <LayoutDashboard className="h-5 w-5" />,
          });
        }
      });
    }

    return items;
  }, [menuItems]);

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      {preset && (
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xl shrink-0 p-1 bg-white rounded-lg border border-slate-200 shadow-xs">
            {preset.theme?.badgeEmoji || preset.theme?.emblem || "🏢"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 truncate">{currentOrg?.name || preset.name}</div>
            <div className="text-[10px] text-slate-500 font-medium truncate">{preset.name}</div>
          </div>
        </div>
      )}
      <nav className="flex-1 space-y-1 px-3 py-3">
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
                  ? activeStyle.bg
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <span className={cn(isActive ? activeStyle.icon : "text-slate-400")}>
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
  const location = useLocation();
  const org = useOptionalOrganization();
  const moduleChrome = shouldUseModuleChrome(
    org?.currentOrganization?.industry_type,
    location.pathname
  );

  if (moduleChrome) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
        <OmniSearchModal />
        <ConfirmDialog />
        <KeyboardShortcutsModal />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto p-4 pb-[max(5rem,env(safe-area-inset-bottom))] sm:p-6 md:p-8 lg:pb-8">
          {children}
        </main>
      </div>
      <MobileBottomDock />
      <OmniSearchModal />
      <ConfirmDialog />
      <KeyboardShortcutsModal />
    </div>
  );
};
