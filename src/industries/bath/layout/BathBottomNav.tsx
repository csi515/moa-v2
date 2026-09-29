import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavTabs } from '@/core/auth/navUtils';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getBathMainTabs, getBathMoreTabs } from '../config/nav';

export const BathBottomNav: FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs } = usePermissions();

  return (
    <ModuleBottomNav
      theme="orange"
      mainTabs={filterNavTabs(getBathMainTabs(labels), allowedTabs)}
      moreTabs={filterNavTabs(getBathMoreTabs(), allowedTabs)}
      activeTab={activeTab}
      onNavigate={setActiveTab}
      moreMenuTitle="전체 메뉴"
      moreMenuDescription="설정"
    />
  );
};
