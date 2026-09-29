import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavTabs } from '@/core/auth/navUtils';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getSkinMainTabs, getSkinMoreTabs } from '../config/nav';

export const SkinBottomNav: FC = () => {
  const { activeTab, setActiveTab, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs } = usePermissions();

  return (
    <ModuleBottomNav
      theme="rose"
      mainTabs={filterNavTabs(getSkinMainTabs(labels), allowedTabs)}
      moreTabs={filterNavTabs(getSkinMoreTabs(), allowedTabs)}
      activeTab={activeTab}
      onNavigate={(tab) => {
        if (tab === 'members') setSelectedStudentId(null);
        setActiveTab(tab);
      }}
      moreMenuTitle="더보기"
      moreMenuDescription="상품 · 출입 · 설정"
    />
  );
};
