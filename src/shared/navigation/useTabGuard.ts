import { useEffect } from 'react';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';

/** 현재 탭이 역할 권한 밖이면 허용된 기본 탭으로 리다이렉트 */
export function useTabGuard(fallbackTab?: NavTab) {
  const { activeTab, setActiveTab } = useApp();
  const { canAccess, defaultTab, allowedTabs } = usePermissions();

  useEffect(() => {
    if (!canAccess(activeTab)) {
      const next = fallbackTab && allowedTabs.includes(fallbackTab) ? fallbackTab : defaultTab;
      setActiveTab(next);
    }
  }, [activeTab, canAccess, defaultTab, fallbackTab, allowedTabs, setActiveTab]);
}
