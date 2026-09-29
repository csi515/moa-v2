import type { NavTab } from '@/context/AppContext';
import type { NavMenuSection } from '@/core/auth/navUtils';
import { isNavItemActive } from '@/core/auth/navUtils';
import type { ModuleTheme } from './moduleTheme';
import { MODULE_THEMES } from './moduleTheme';

export interface ModuleSidebarUser {
  name: string;
  roleLabel: string;
  roleBadge: string;
}

interface ModuleSidebarProps {
  sections: NavMenuSection[];
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  theme: ModuleTheme;
  user: ModuleSidebarUser;
  /** 기본: 모바일에서 숨김 */
  className?: string;
  /** 업종별 하이라이트 (미지정 시 core isNavItemActive) */
  isItemActive?: (itemTab: NavTab, activeTab: NavTab) => boolean;
}

/** 모듈 공통 데스크톱 사이드바 (섹션 + 역할 푸터) */
export function ModuleSidebar({
  sections,
  activeTab,
  onNavigate,
  theme,
  user,
  className = 'hidden md:flex',
  isItemActive = isNavItemActive,
}: ModuleSidebarProps) {
  const t = MODULE_THEMES[theme];

  return (
    <aside
      className={`${className} w-64 bg-white text-slate-600 flex-col h-[calc(100vh-65px)] sticky top-[65px] border-r border-slate-200 select-none shrink-0 no-print`}
    >
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-3">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              {section.title}
            </p>
            {section.items.map((item) => {
              const isActive = isItemActive(item.tab, activeTab);
              return (
                <button
                  key={item.tab}
                  id={`nav-${item.tab}`}
                  type="button"
                  onClick={() => onNavigate(item.tab)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? t.sidebarActive
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <span className={isActive ? t.sidebarActiveIcon : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-3.5 border-t border-slate-100 bg-slate-50/70">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${t.sidebarBadge}`}
          >
            {user.roleBadge}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{user.name}</p>
            <p className="text-[10px] text-slate-400">{user.roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
