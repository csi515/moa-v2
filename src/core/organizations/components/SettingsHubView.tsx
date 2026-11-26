import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';
import { Settings } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import type { NavTab } from '@/shared/navigation/navigationTypes';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { WorkplaceSettingsView } from './WorkplaceSettingsView';
import { BillingSettingsView } from './BillingSettingsView';
import { LessonToolsSettingsView } from './LessonToolsSettingsView';
import { OrganizationDataSettingsView } from './OrganizationDataSettingsView';

export type SettingsHubSegment = 'workplace' | 'billing' | 'lessons' | 'data';

export interface SettingsHubViewProps {
  staffView?: FC;
  staffTab?: NavTab;
  extras?: { tab: NavTab; label: string }[];
  workplaceLabel?: string;
  staffLabel?: string;
  feeLabel?: string;
}

function tabToSegment(tab: string): SettingsHubSegment {
  if (tab === 'billing' || tab === 'tuition' || tab === 'unpaid') return 'billing';
  if (tab === 'data' || tab === 'export' || tab === 'backup') return 'data';
  if (
    tab === 'practice-rooms' ||
    tab === 'practice' ||
    tab === 'assignments' ||
    tab === 'classes' ||
    tab === 'textbooks' ||
    tab === 'curriculum' ||
    tab === 'resources' ||
    tab === 'song-stamps' ||
    tab === 'recitals' ||
    tab === 'achievements' ||
    tab === 'reports' ||
    tab === 'bookings'
  ) {
    return 'lessons';
  }
  return 'workplace';
}

/**
 * 4대 핵심 카테고리 운영 설정 허브:
 * [기본 정보·공간] - [수강료·수납] - [수업·운영 도구] - [데이터 관리·기타]
 */
export const SettingsHubView: FC<SettingsHubViewProps> = ({
  extras = [],
  workplaceLabel = '학원',
  feeLabel = '수강료',
}) => {
  const { activeTab } = useApp();
  const tabSegment = useMemo(() => tabToSegment(activeTab), [activeTab]);
  const [uiSegment, setUiSegment] = useState<SettingsHubSegment>(tabSegment);

  useEffect(() => {
    setUiSegment(tabSegment);
  }, [tabSegment]);

  const options = useMemo(() => [
    { value: 'workplace' as const, label: `${workplaceLabel} 기본·공간` },
    { value: 'billing' as const, label: `${feeLabel}·수납` },
    { value: 'lessons' as const, label: '수업·운영 도구' },
    { value: 'data' as const, label: '데이터 관리·기타' },
  ], [workplaceLabel, feeLabel]);

  let body: ReactNode = null;
  if (uiSegment === 'workplace') {
    body = <WorkplaceSettingsView />;
  } else if (uiSegment === 'billing') {
    body = <BillingSettingsView />;
  } else if (uiSegment === 'lessons') {
    body = <LessonToolsSettingsView extras={extras} />;
  } else {
    body = <OrganizationDataSettingsView />;
  }

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<Settings className="w-5 h-5 text-slate-700" strokeWidth={1.5} />}
        title={`${workplaceLabel} 운영 설정`}
        description="사업장 기본 정보, 공간 및 연습실 등록, 수납 정책 및 데이터 관리"
        actions={
          <div className="w-full sm:w-auto overflow-x-auto no-scrollbar -mx-1 px-1 py-0.5">
            <SegmentedControl
              value={uiSegment}
              options={options}
              onChange={(next) => setUiSegment(next as SettingsHubSegment)}
              aria-label="설정 카테고리 메뉴"
              fullWidth
              className="w-full sm:w-auto min-w-[360px]"
            />
          </div>
        }
      />
      {body}
    </div>
  );
};

export default SettingsHubView;
