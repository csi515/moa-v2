import type { FC } from 'react';
import { useApp } from '@/context/AppContext';
import { useModuleLabels } from '@/core/labels';
import { usePermissions } from '@/core/auth/usePermissions';
import { filterNavTabs } from '@/core/auth/navUtils';
import { ModuleBottomNav } from '@/shared/components/layout/ModuleBottomNav';
import { getPianoMainTabs, getPianoMoreTabs } from '../config/nav';
import { isPianoNavItemActive, resolvePianoNavHighlightTab } from '../config/navHighlight';
import { usePianoNavigate } from './usePianoNavigate';

export const PianoBottomNav: FC = () => {
  const { activeTab } = useApp();
  const labels = useModuleLabels();
  const { allowedTabs } = usePermissions();
  const onNavigate = usePianoNavigate();

  return (
    <ModuleBottomNav
      theme="indigo"
      mainTabs={filterNavTabs(getPianoMainTabs(labels), allowedTabs)}
      moreTabs={filterNavTabs(getPianoMoreTabs(labels), allowedTabs)}
      activeTab={activeTab}
      onNavigate={onNavigate}
      resolveHighlightTab={resolvePianoNavHighlightTab}
      isItemActive={isPianoNavItemActive}
      moreMenuTitle="더보기"
      moreMenuDescription="상담 · 수납·재무 · 설정 (부가 기능은 설정 안)"
    />
  );
};
