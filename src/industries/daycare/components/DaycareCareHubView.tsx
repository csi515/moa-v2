import { useEffect, useMemo, useState, type FC } from 'react';
import { BookOpen, ClipboardList, Pill } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { peekCareFocus, subscribeCareFocus } from '../care/careFocus';

type CareSegment = 'journals' | 'medications' | 'records';

const SEGMENT_COPY: Record<CareSegment, { title: string; description: string }> = {
  journals: { title: '보육', description: '알림장 작성·확인' },
  medications: { title: '보육', description: '투약 요청 관리' },
  records: { title: '보육', description: '예방접종·검진·귀가·사고' },
};

/** 어린이집 보육 허브 — 알림장·투약·법정 기록 */
export const DaycareCareHubView: FC<{
  journalsView: FC;
  medicationsView: FC;
  recordsView: FC;
}> = ({ journalsView: JournalsView, medicationsView: MedicationsView, recordsView: RecordsView }) => {
  const { activeTab, setActiveTab } = useApp();
  const [recordsOpen, setRecordsOpen] = useState(false);

  useEffect(() => {
    const apply = () => {
      const pending = peekCareFocus();
      if (pending?.kind === 'records') {
        setRecordsOpen(true);
        return;
      }
      setRecordsOpen(false);
    };
    apply();
    return subscribeCareFocus(apply);
  }, [activeTab]);
  const segment: CareSegment = useMemo(() => {
    if (recordsOpen) return 'records';
    return activeTab === 'medications' ? 'medications' : 'journals';
  }, [activeTab, recordsOpen]);
  const copy = SEGMENT_COPY[segment];

  const selectSegment = (next: CareSegment) => {
    if (next === 'records') {
      setRecordsOpen(true);
      return;
    }
    setRecordsOpen(false);
    setActiveTab(next);
  };

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={
          segment === 'records' ? (
            <ClipboardList className="w-5 h-5" />
          ) : segment === 'journals' ? (
            <BookOpen className="w-5 h-5" />
          ) : (
            <Pill className="w-5 h-5" />
          )
        }
        title={copy.title}
        description={copy.description}
        actions={
          <SegmentedControl
            value={segment}
            options={[
              { value: 'journals', label: '알림장' },
              { value: 'medications', label: '투약' },
              { value: 'records', label: '기록' },
            ]}
            onChange={selectSegment}
            aria-label="보육 메뉴"
            fullWidth
            className="w-full sm:w-auto min-w-[220px]"
          />
        }
      />
      {segment === 'journals' ? <JournalsView /> : segment === 'medications' ? <MedicationsView /> : <RecordsView />}
    </div>
  );
};
