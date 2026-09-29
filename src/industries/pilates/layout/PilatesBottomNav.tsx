import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavTabs } from '@/core/auth/navUtils';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getPilatesMainTabs, getPilatesMoreTabs } from '../config/nav';

export const PilatesBottomNav: FC = () => {
  const { activeTab, setActiveTab, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs } = usePermissions();

  return (
    <ModuleBottomNav
      theme="teal"
      mainTabs={filterNavTabs(getPilatesMainTabs(labels), allowedTabs)}
      moreTabs={filterNavTabs(getPilatesMoreTabs(), allowedTabs)}
      activeTab={activeTab}
      onNavigate={(tab) => {
        if (tab === 'members') setSelectedStudentId(null);
        setActiveTab(tab);
      }}
      moreMenuTitle="더보기"
      moreMenuDescription="출결 · 설정"
    />
  );
};
