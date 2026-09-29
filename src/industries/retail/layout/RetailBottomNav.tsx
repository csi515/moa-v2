import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavTabs } from '@/core/auth/navUtils';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getRetailMainTabs, getRetailMoreTabs } from '../config/nav';
import { resolveRetailNavHighlightTab } from '../config/navHighlight';

export const RetailBottomNav: FC = () => {
  const { activeTab, setActiveTab, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs } = usePermissions();

  return (
    <ModuleBottomNav
      theme="teal"
      mainTabs={filterNavTabs(getRetailMainTabs(labels), allowedTabs)}
      moreTabs={filterNavTabs(getRetailMoreTabs(labels), allowedTabs)}
      activeTab={activeTab}
      resolveHighlightTab={resolveRetailNavHighlightTab}
      isItemActive={(itemTab, current) => resolveRetailNavHighlightTab(current) === itemTab}
      onNavigate={(tab) => {
        if (tab === 'members') setSelectedStudentId(null);
        setActiveTab(tab);
      }}
      moreMenuTitle="더보기"
      moreMenuDescription="매출 · 판매내역 · 직원 · 설정"
    />
  );
};
