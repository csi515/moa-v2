import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  registerStudentDetailExtension,
  type StudentDetailExtension,
  type StudentDetailExtraTabProps,
} from '@/core/academy/components/students/detail/studentDetailExtensions';
import type { DetailTab, DetailTabConfigItem, DetailTabCounts } from '@/core/academy/components/students/detail/types';
import { SkinChartTab } from '@/industries/skin/components/charts/SkinChartTab';

const SKIN_HIDDEN_DETAIL_TABS = new Set<DetailTab>(['classes', 'practice', 'videos', 'textbooks']);

function resolveSkinTabs(
  tabs: DetailTabConfigItem[],
  _counts: DetailTabCounts
): DetailTabConfigItem[] {
  const visible = tabs.filter((tab) => !SKIN_HIDDEN_DETAIL_TABS.has(tab.id));
  const charts: DetailTabConfigItem = {
    id: 'charts',
    label: '시술 기록',
    icon: React.createElement(Sparkles, { className: 'w-3.5 h-3.5' }),
    group: 'primary',
  };
  const infoIndex = visible.findIndex((tab) => tab.id === 'info');
  visible.splice(Math.max(infoIndex, 0) + 1, 0, charts);
  return visible;
}

function renderSkinExtraTab({ tab, student }: StudentDetailExtraTabProps) {
  if (tab !== 'charts') return null;
  return React.createElement(SkinChartTab, { customerId: student.id });
}

const skinStudentDetailExtension: StudentDetailExtension = {
  industryId: 'skin_clinic',
  resolveTabs: resolveSkinTabs,
  renderExtraTab: renderSkinExtraTab,
};

/** Core 학생 상세가 skin Module을 import하지 않도록 plugin에서 등록 */
export function registerSkinStudentDetailExtension(): () => void {
  return registerStudentDetailExtension(skinStudentDetailExtension);
}
