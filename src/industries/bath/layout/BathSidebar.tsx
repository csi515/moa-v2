import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavSections } from '@/core/auth/navUtils';
import { ModuleSidebar } from '@/shared/components/layout/ModuleSidebar';
import { getBathSidebarSections } from '../config/nav';

export const BathSidebar: FC = () => {
  const { activeTab, setActiveTab, currentUser } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs, roleLabel, roleBadge } = usePermissions();
  const sections = filterNavSections(getBathSidebarSections(labels), allowedTabs);

  return (
    <ModuleSidebar
      theme="orange"
      sections={sections}
      activeTab={activeTab}
      onNavigate={setActiveTab}
      user={{ name: currentUser.name, roleLabel, roleBadge }}
    />
  );
};
