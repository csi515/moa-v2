import { useState, type FC } from 'react';
import { Piano } from 'lucide-react';
import { SegmentedControl } from '@/shared/components';
import { TodayLessonView } from './TodayLessonView';
import { LessonRecordsView } from './LessonRecordsView';

type LessonSegment = 'today' | 'history';

const LESSON_OPTIONS: { value: LessonSegment; label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'history', label: '기록' },
];

/** 수업 허브 — 오늘 진행 / 전체 기록.
 * 라우팅: `lessons` 탭은 PianoAppContent에서 출결(`PianoAttendanceView`)로 별칭됨.
 * 이 화면은 export·회귀용으로 유지 (네비 미노출).
 */
export const LessonsHubView: FC = () => {
  const [segment, setSegment] = useState<LessonSegment>('today');

  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-slate-50/90 backdrop-blur-sm space-y-3">
        <div className="px-0.5">
          <p className="text-[11px] font-semibold text-indigo-600">수업</p>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Piano className="w-5 h-5 text-indigo-600 shrink-0" />
            {segment === 'today' ? '오늘 수업' : '수업 기록'}
          </h2>
        </div>
        <SegmentedControl
          value={segment}
          options={LESSON_OPTIONS}
          onChange={setSegment}
          aria-label="수업 보기 전환"
          fullWidth
          className="w-full shadow-xs"
        />
      </div>
      {segment === 'today' ? <TodayLessonView compactHeader /> : <LessonRecordsView />}
    </div>
  );
};
