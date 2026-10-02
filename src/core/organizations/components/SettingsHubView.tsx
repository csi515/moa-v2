import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { AcademySettingsView } from './AcademySettingsView';
import { TeacherManagementView } from '@/core/staff/components/TeacherManagementView';
import { ParentNoticeView } from '@/core/notices';
import { MyAccountView } from '@/core/account';

export type SettingsHubSegment = 'workplace' | 'staff' | 'notices' | 'account' | 'extras';

const SEGMENT_TO_TAB: Record<Exclude<SettingsHubSegment, 'extras'>, NavTab> = {
  workplace: 'settings',
  staff: 'teachers',
  notices: 'notices',
  account: 'account',
};

function tabToSegment(tab: string): Exclude<SettingsHubSegment, 'extras'> {
  if (tab === 'teachers' || tab === 'instructors') return 'staff';
  if (tab === 'notices') return 'notices';
  if (tab === 'account') return 'account';
  return 'workplace';
}

/** 설정 허브 — 사업장·직원·안내·계정 (+ 부가 링크) */
export const SettingsHubView: FC<{
  staffView?: FC;
  staffTab?: NavTab;
  extras?: { tab: NavTab; label: string }[];
  workplaceLabel?: string;
  staffLabel?: string;
}> = ({
  staffView: StaffView = TeacherManagementView,
  staffTab = 'teachers',
  extras = [],
  workplaceLabel = '사업장',
  staffLabel = '직원',
}) => {
  const { activeTab, setActiveTab } = useApp();
  const tabSegment = useMemo(() => tabToSegment(activeTab), [activeTab]);
  const [uiSegment, setUiSegment] = useState<SettingsHubSegment>(tabSegment);

  useEffect(() => {
    setUiSegment(tabSegment);
  }, [tabSegment]);

  const options = useMemo(() => {
    const base: { value: SettingsHubSegment; label: string }[] = [
      { value: 'workplace', label: workplaceLabel },
      { value: 'staff', label: staffLabel },
      { value: 'notices', label: '안내' },
      { value: 'account', label: '계정' },
    ];
    if (extras.length > 0) base.push({ value: 'extras', label: '부가' });
    return base;
  }, [extras.length, staffLabel, workplaceLabel]);

  const handleChange = (next: SettingsHubSegment) => {
    if (next === 'extras') {
      setUiSegment('extras');
      return;
    }
    setUiSegment(next);
    if (next === 'staff') setActiveTab(staffTab);
    else setActiveTab(SEGMENT_TO_TAB[next]);
  };

  let body: ReactNode = null;
  if (uiSegment === 'extras') {
    body = (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {extras.map((item) => (
          <button
            key={item.tab}
            type="button"
            onClick={() => setActiveTab(item.tab)}
            className="text-left px-4 py-3.5 min-h-[44px] rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
          >
            <span className="text-sm font-bold text-slate-900">{item.label}</span>
          </button>
        ))}
      </div>
    );
  } else if (uiSegment === 'workplace') body = <AcademySettingsView />;
  else if (uiSegment === 'staff') body = <StaffView />;
  else if (uiSegment === 'notices') body = <ParentNoticeView />;
  else body = <MyAccountView />;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<Settings className="w-6 h-6" />}
        title="설정"
        actions={
          <SegmentedControl
            value={uiSegment}
            options={options}
            onChange={handleChange}
            aria-label="설정 메뉴"
            fullWidth
            className="w-full sm:w-auto min-w-[280px]"
          />
        }
      />
      {body}
    </div>
  );
};
