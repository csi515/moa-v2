import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavSections } from '@/core/auth/navUtils';
import { ModuleSidebar } from '@/shared/components/layout/ModuleSidebar';
import { getPianoSidebarSections } from '../config/nav';
import { isPianoNavItemActive } from '../config/navHighlight';
import { usePianoNavigate } from './usePianoNavigate';

export const PianoSidebar: FC = () => {
  const { activeTab, currentUser } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs, roleLabel, roleBadge } = usePermissions();
  const onNavigate = usePianoNavigate();

  const sections = filterNavSections(getPianoSidebarSections(labels), allowedTabs);

  return (
    <ModuleSidebar
      theme="indigo"
      sections={sections}
      activeTab={activeTab}
      onNavigate={onNavigate}
      isItemActive={isPianoNavItemActive}
      user={{ name: currentUser.name, roleLabel, roleBadge }}
    />
  );
};
