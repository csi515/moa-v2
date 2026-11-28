import { useState, type FC } from 'react';
import { Piano } from 'lucide-react';
import { PageHeader, SegmentedControl } from '@/shared/components';
import { TodayLessonView } from './TodayLessonView';
import { LessonRecordsView } from './LessonRecordsView';

type LessonSegment = 'today' | 'history';

const LESSON_OPTIONS: { value: LessonSegment; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'history', label: '기록' },
];

/**
 * 수업 허브 — 오늘 진행 / 전체 기록.
 * 라우팅: `lessons` 탭은 PianoAppContent에서 출결(`PianoAttendanceView`)로 별칭됨.
 * 이 화면은 export·회귀용으로 유지 (네비 미노출).
 * PageHeader는 허브 1개만 — 자식은 embedded.
 */
export const LessonsHubView: FC = () => {
  const [segment, setSegment] = useState<LessonSegment>('today');

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        density="compact"
        icon={<Piano className="w-5 h-5" />}
        title={segment === 'today' ? '오늘 수업' : '수업 기록'}
        description={
          segment === 'today'
            ? '오늘 예정된 레슨과 담당 강사별 수강생'
            : '원생별 레슨 일지·진도 관리'
        }
        actions={
          <SegmentedControl
            value={segment}
            options={LESSON_OPTIONS}
            onChange={setSegment}
            aria-label="수업 보기 전환"
            fullWidth
            className="w-full sm:w-auto min-w-[160px]"
          />
        }
      />
      {segment === 'today' ? <TodayLessonView embedded /> : <LessonRecordsView embedded />}
    </div>
  );
};
