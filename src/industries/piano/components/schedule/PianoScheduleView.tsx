import { useEffect, useMemo, type FC, type ReactNode } from 'react';
import { Calendar, Clock, DoorOpen, Sparkles, type LucideIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { useStaffGrants, useStaffScope } from '@/hooks';
import { AcademyCalendarView } from '@/core/academy';
import { SegmentedControl } from '@/shared/components';
import { MakeupManagementView } from '../makeup/MakeupManagementView';
import { PracticeRoomBookingView } from '../practiceRooms/PracticeRoomBookingView';
import { PianoLessonTimetableView } from './PianoLessonTimetableView';

type CoreScheduleSegment = 'classes' | 'makeups';
type AuxScheduleSegment = 'events' | 'rooms';
type ScheduleSegment = CoreScheduleSegment | AuxScheduleSegment;

const CORE_SEGMENT_OPTIONS: { value: CoreScheduleSegment; label: string }[] = [
  { value: 'classes', label: '시간표' },
  { value: 'makeups', label: '보강' },
];

function tabToSegment(tab: string): ScheduleSegment {
  if (tab === 'calendar') return 'events';
  if (tab === 'makeups') return 'makeups';
  if (tab === 'practice-rooms') return 'rooms';
  return 'classes';
}

/** 피아노 일정 — 핵심은 시간표·보강. 캘린더·연습실은 별도 화면(딥링크 유지) */
export const PianoScheduleView: FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const placeLabel = getPlaceLabel(industry);
  const { isScoped } = useStaffScope();
  const { allow } = useStaffGrants();
  const canRooms = !isScoped || allow('practiceRooms');

  useEffect(() => {
    if (!canRooms && activeTab === 'practice-rooms') setActiveTab('timetable');
  }, [canRooms, activeTab, setActiveTab]);

  const segment = useMemo(() => {
    const next = tabToSegment(activeTab);
    if (!canRooms && next === 'rooms') return 'classes';
    return next;
  }, [activeTab, canRooms]);

  const handleCoreChange = (next: CoreScheduleSegment) => {
    if (next === 'makeups') setActiveTab('makeups');
    else setActiveTab('timetable');
  };

  if (segment === 'events') {
    return (
      <AuxScheduleScreen
        eyebrow="일정"
        title={`${placeLabel} 캘린더`}
        icon={Calendar}
        onBack={() => setActiveTab('timetable')}
      >
        <AcademyCalendarView embedded />
      </AuxScheduleScreen>
    );
  }

  if (segment === 'rooms' && canRooms) {
    return (
      <AuxScheduleScreen
        eyebrow="일정"
        title="연습실 예약"
        icon={DoorOpen}
        onBack={() => setActiveTab('timetable')}
      >
        <PracticeRoomBookingView />
      </AuxScheduleScreen>
    );
  }

  const title = segment === 'makeups' ? '보강' : '시간표';
  const TitleIcon = segment === 'makeups' ? Sparkles : Clock;

  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-slate-50/90 backdrop-blur-sm space-y-3">
        <div className="flex items-end justify-between gap-3 px-0.5">
          <div>
            <p className="text-[11px] font-semibold text-indigo-600">일정</p>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <TitleIcon className="w-5 h-5 text-indigo-600 shrink-0" />
              {title}
            </h2>
          </div>
        </div>
        <SegmentedControl
          value={segment === 'makeups' ? 'makeups' : 'classes'}
          options={CORE_SEGMENT_OPTIONS}
          onChange={handleCoreChange}
          aria-label="일정 보기 전환"
          fullWidth
          className="w-full shadow-xs"
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-0.5 text-[11px] text-slate-500">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className="font-semibold text-slate-600 hover:text-indigo-600 min-h-[44px] sm:min-h-0 py-1"
          >
            캘린더
          </button>
          {canRooms && (
            <>
              <span aria-hidden className="text-slate-300">
                ·
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('practice-rooms')}
                className="font-semibold text-slate-600 hover:text-indigo-600 min-h-[44px] sm:min-h-0 py-1"
              >
                연습실
              </button>
            </>
          )}
        </div>
      </div>

      {segment === 'classes' && <PianoLessonTimetableView />}
      {segment === 'makeups' && <MakeupManagementView />}
    </div>
  );
};

function AuxScheduleScreen({
  eyebrow,
  title,
  icon: Icon,
  onBack,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  onBack: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4 pb-4">
      <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-slate-50/90 backdrop-blur-sm space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 min-h-[44px] sm:min-h-0"
        >
          ← 시간표로
        </button>
        <div className="px-0.5">
          <p className="text-[11px] font-semibold text-indigo-600">{eyebrow}</p>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Icon className="w-5 h-5 text-indigo-600 shrink-0" />
            {title}
          </h2>
        </div>
      </div>
      {children}
    </div>
  );
}
