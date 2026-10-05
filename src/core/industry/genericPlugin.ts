import type { NavTab } from '@/shared/navigation/navigationTypes';
import type { IndustryPluginManifest } from './pluginTypes';
import type { IndustryDefinition } from './catalog';
import { withNoticesTabs } from './pluginTypes';
import { defaultExpenseCategories } from './defaultExpenseCategories';

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
    placeLabel: '사업장',
    ownerLabel: definition.id === 'academy' ? '원장' : '대표',
    placeNamePlaceholder: '예: 행복 사업장',
    customerLabel: '고객',
    isAppointment: false,
    feeLabel: '이용료',
    bankAccountPlaceholder: '예: 국민은행 000000-00-000000 (예금주: 홍길동)',
    supportsDeposit: false,
    showsTextbooksLink: false,
    runsPinCheckInSideEffects: false,
    showsMakeupList: false,
    usesWithdrawalExitLabel: false,
    roomConfig: {
      sectionTitle: '공간',
      sectionDescription: '사업장에서 쓰는 공간 이름을 등록해 주세요.',
      defaultPrefix: '공간',
      defaultKind: 'classroom',
      placeholder: '예: 1실',
      allowedKinds: ['classroom', 'practice'],
    },
    adminTabs: [...GENERIC_ADMIN_TABS],
    staffTabs: ['dashboard', 'settings', 'account'],
    getExpenseCategories: () => defaultExpenseCategories(),
};
}
