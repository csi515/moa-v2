import { useMemo, type FC } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { useWorkUi as useApp } from '@/shared/navigation/useWorkUi';
import { usePermissions } from '@/core/auth/usePermissions';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { SegmentedControl } from '@/shared/components';
import { WeeklyTimetableView } from '../timetable/WeeklyTimetableView';
type ScheduleSegment = 'classes' | 'events';

export interface ClassScheduleHubViewProps {
  calendarView?: FC<{ embedded?: boolean }>;
}

/**
 * 반·시간표 기반 업종 공통 일정 허브 (Gym/Daycare/Piano 패턴)
 * timetable ↔ calendar 딥링크 유지
 */
export const ClassScheduleHubView: FC<ClassScheduleHubViewProps> = ({ calendarView: CalendarView }) => {
  const { activeTab, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const placeLabel = getPlaceLabel(industry);
  const eventsLabel = `${placeLabel} 캘린더`;

  const segmentOptions = useMemo(
    () =>
      [
        { value: 'classes' as const, label: '수업 시간표' },
        { value: 'events' as const, label: eventsLabel },
      ],
    [eventsLabel]
  );

  const segment: ScheduleSegment = useMemo(
    () => (activeTab === 'calendar' ? 'events' : 'classes'),
    [activeTab]
  );

  const handleSegmentChange = (next: ScheduleSegment) => {
    setActiveTab(next === 'events' ? 'calendar' : 'timetable');
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-slate-50/90 backdrop-blur-sm space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div>
            <p className="text-[11px] font-semibold text-indigo-600">일정</p>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              {segment === 'classes' ? (
                <Clock className="w-5 h-5 text-indigo-600" />
              ) : (
                <Calendar className="w-5 h-5 text-indigo-600" />
              )}
              {segment === 'classes' ? '수업 시간표' : eventsLabel}
            </h2>
          </div>
        </div>
        <SegmentedControl
          value={segment}
          options={segmentOptions}
          onChange={handleSegmentChange}
          aria-label="일정 보기 전환"
          fullWidth
          className="w-full shadow-xs"
        />
      </div>

      {segment === 'classes' ? (
        <WeeklyTimetableView embedded />
      ) : CalendarView ? (
        <CalendarView embedded />
      ) : null}
    </div>
  );
};
