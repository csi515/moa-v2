import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavSections } from '@/core/auth/navUtils';
import { ModuleSidebar } from '@/shared/components/layout/ModuleSidebar';
import { getDaycareSidebarSections } from '../config/nav';

export const DaycareSidebar: FC = () => {
  const { activeTab, setActiveTab, currentUser, setSelectedStudentId } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs, roleLabel, roleBadge } = usePermissions();

  const sections = filterNavSections(getDaycareSidebarSections(labels), allowedTabs);

  return (
    <ModuleSidebar
      theme="sky"
      sections={sections}
      activeTab={activeTab}
      onNavigate={(tab) => {
        if (tab === 'students') setSelectedStudentId(null);
        setActiveTab(tab);
      }}
      user={{ name: currentUser.name, roleLabel, roleBadge }}
    />
  );
};
