import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavTabs } from '@/core/auth/navUtils';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getDaycareMainTabs, getDaycareMoreTabs } from '../config/nav';

export const DaycareBottomNav: FC = () => {
  const { activeTab, setActiveTab, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs } = usePermissions();

  return (
    <ModuleBottomNav
      theme="sky"
      mainTabs={filterNavTabs(getDaycareMainTabs(labels), allowedTabs)}
      moreTabs={filterNavTabs(getDaycareMoreTabs(labels), allowedTabs)}
      activeTab={activeTab}
      onNavigate={(tab) => {
        if (tab === 'students') setSelectedStudentId(null);
        setActiveTab(tab);
      }}
      moreMenuTitle="전체 메뉴"
      moreMenuDescription="상담 · 재무 · 설정"
    />
  );
};
