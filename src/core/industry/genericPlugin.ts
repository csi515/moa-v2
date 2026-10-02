import type { NavTab } from '@/shared/navigation/navigationTypes';
import type { IndustryPluginManifest } from './pluginTypes';
import type { IndustryDefinition } from './catalog';
import { withNoticesTabs } from './pluginTypes';

const GENERIC_CORE_TABS: NavTab[] = ['dashboard', 'settings', 'account'];
const GENERIC_ADMIN_TABS = withNoticesTabs(GENERIC_CORE_TABS);

/** 모듈 없는 업종용 기본 플러그인 매니페스트 */
export function buildGenericPluginManifest(definition: IndustryDefinition): IndustryPluginManifest {
  return {
    id: definition.id,
    option: {
      value: definition.id,
      label: definition.label,
      description: definition.description,
    },
    theme: 'indigo',
    accent: {
      btn: 'bg-slate-700',
      btnHover: 'hover:bg-slate-800',
      icon: 'text-slate-600',
      hoverBg: 'hover:bg-slate-50',
      ring: 'focus:ring-slate-500 focus:border-slate-300',
    },
    attendanceDefault: false,
    usesClassBasedSchedule: false,
    customerListTab: 'students',
    showSchoolFields: false,
    showPickupFields: false,
    levelLabel: '레벨',
    placeLabel: '학원',
    ownerLabel: definition.id === 'academy' ? '원장' : '대표',
    placeNamePlaceholder: '예: 행복 학원',
    customerLabel: '원생',
    isAppointment: false,
    adminTabs: [...GENERIC_ADMIN_TABS],
    staffTabs: ['dashboard', 'settings', 'account'],
  };
}
