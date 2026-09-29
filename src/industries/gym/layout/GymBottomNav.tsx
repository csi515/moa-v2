import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavTabs } from '@/core/auth/navUtils';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getGymMainTabs, getGymMoreTabs } from '../config/nav';

export const GymBottomNav: FC = () => {
  const { activeTab, setActiveTab, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs } = usePermissions();

  return (
    <ModuleBottomNav
      theme="orange"
      mainTabs={filterNavTabs(getGymMainTabs(labels), allowedTabs)}
      moreTabs={filterNavTabs(getGymMoreTabs(labels), allowedTabs)}
      activeTab={activeTab}
      onNavigate={(tab) => {
        if (tab === 'students') setSelectedStudentId(null);
        setActiveTab(tab);
      }}
      moreMenuTitle="전체 메뉴"
      moreMenuDescription="재무 · 차량 · 설정"
    />
  );
};
