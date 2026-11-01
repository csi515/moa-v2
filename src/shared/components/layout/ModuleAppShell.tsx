import type { ReactNode } from 'react';
import { Header } from './Header';
import type { ModuleTheme } from './moduleTheme';
import { MODULE_THEMES } from './moduleTheme';
import { cn } from '@/shared/lib/utils';

interface ModuleAppShellProps {
  theme: ModuleTheme;
  sidebar: ReactNode;
  bottomNav: ReactNode;
  children: ReactNode;
  /** Header 위 (예: SupabaseRoleSync) */
  beforeHeader?: ReactNode;
  /** FAB, Toast, Confirm 등 */
  overlays?: ReactNode;
  /**
   * App.tsx 가 이미 Header를 렌더할 때 true.
   * Layout 안 nested 크로뮴에서 이중 헤더를 막는다.
   */
  omitHeader?: boolean;
  /**
   * Layout 메인 영역 안에 넣을 때 true.
   * min-h-screen 셸 배경 대신 flex-1로 부모 높이를 채운다.
   */
  nested?: boolean;
}

/**
 * 모듈 공통 앱 셸 — Header + 사이드바 + 메인 + 하단 네비.
 */
export function ModuleAppShell({
  theme,
  sidebar,
  bottomNav,
  children,
  beforeHeader,
  overlays,
  omitHeader = false,
  nested = false,
}: ModuleAppShellProps) {
  const t = MODULE_THEMES[theme];

  return (
    <div
      className={cn(
        nested
          ? 'flex min-h-0 flex-1 flex-col bg-[#F1F5F9] text-slate-800 font-sans antialiased'
          : t.shell
      )}
      data-module-chrome={theme}
    >
      {beforeHeader}
      {!omitHeader ? <Header /> : null}
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1">
        {sidebar}
        <main
          data-work-scroll-root
          data-testid="app-work-main"
          className="main-with-bottom-nav max-w-full flex-1 overflow-x-hidden overflow-y-auto p-3 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:p-5 md:pb-5"
        >
          {children}
        </main>
      </div>
      {bottomNav}
      {overlays}
    </div>
  );
}
