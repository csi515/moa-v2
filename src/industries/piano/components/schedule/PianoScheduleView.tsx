import { useEffect, useMemo, useState, type FC } from 'react';
import { Calendar, Clock, DoorOpen, Plus, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { usePermissions } from '@/core/auth/usePermissions';
import { getPlaceLabel } from '@/core/industry/industryUi';
import { useStaffGrants, useStaffScope } from '@/hooks';
import { AcademyCalendarView } from '../calendar/AcademyCalendarView';
import { PageHeader, SegmentedControl, Modal } from '@/shared/components';
import { MakeupManagementView } from '../makeup/MakeupManagementView';
import { PracticeRoomBookingView } from '../practiceRooms/PracticeRoomBookingView';
import { PianoLessonTimetableView } from './PianoLessonTimetableView';

type ScheduleSegment = 'timetable' | 'calendar' | 'rooms';

/**
 * 피아노 일정 뷰
 * - 시간표(주간 그리드)와 주간 달력(학원 캘린더)을 상단 탭으로 즉시 전환
 * - 보강은 독립 탭 대신 시간표 상단 액션(+ 보강 레슨 추가)으로 직관적 연계
 */
export const PianoScheduleView: FC = () => {
  const { activeTab, setActiveTab } = useApp();
  const { industry } = usePermissions();
  const placeLabel = getPlaceLabel(industry);
  const { isScoped } = useStaffScope();
  const { allow } = useStaffGrants();
  const canRooms = !isScoped || allow('practiceRooms');

  const [showMakeupModal, setShowMakeupModal] = useState(false);

  // makeups 딥링크로 진입한 경우 시간표로 전환하면서 보강 모달 자동 오픈
  useEffect(() => {
    if (activeTab === 'makeups') {
      setShowMakeupModal(true);
      setActiveTab('timetable');
    }
  }, [activeTab, setActiveTab]);

  useEffect(() => {
    if (!canRooms && activeTab === 'practice-rooms') {
      setActiveTab('timetable');
    }
  }, [canRooms, activeTab, setActiveTab]);

  const segment: ScheduleSegment = useMemo(() => {
    if (activeTab === 'calendar') return 'calendar';
    if (activeTab === 'practice-rooms' && canRooms) return 'rooms';
    return 'timetable';
  }, [activeTab, canRooms]);

  const segmentOptions = useMemo(() => {
    const opts: { value: ScheduleSegment; label: string }[] = [
      { value: 'timetable', label: '수업 시간표' },
      { value: 'calendar', label: '학원 일정·행사' },
    ];
    if (canRooms) {
      opts.push({ value: 'rooms', label: '연습실' });
    }
    return opts;
  }, [canRooms]);

  const handleSegmentChange = (next: ScheduleSegment) => {
    if (next === 'calendar') setActiveTab('calendar');
    else if (next === 'rooms') setActiveTab('practice-rooms');
    else setActiveTab('timetable');
  };

  const title =
    segment === 'calendar'
      ? `${placeLabel} 일정·행사`
      : segment === 'rooms'
      ? '연습실 예약'
      : '수업 시간표';

  const TitleIcon =
    segment === 'calendar' ? Calendar : segment === 'rooms' ? DoorOpen : Clock;

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        icon={<TitleIcon className="w-5 h-5 text-slate-700" strokeWidth={1.5} />}
        title={title}
        actions={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <SegmentedControl
              value={segment}
              options={segmentOptions}
              onChange={handleSegmentChange}
              aria-label="일정 보기 전환"
              className="w-full sm:w-auto min-w-[280px]"
            />
            {segment === 'timetable' && (
              <button
                type="button"
                onClick={() => setShowMakeupModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold transition shadow-2xs min-h-[36px] cursor-pointer shrink-0"
                title="결석 원생의 보강 레슨을 배정하거나 관리합니다"
              >
                <span>보강 일정 관리</span>
              </button>
            )}
          </div>
        }
      />

      {segment === 'timetable' && <PianoLessonTimetableView />}
      {segment === 'calendar' && <AcademyCalendarView embedded />}
      {segment === 'rooms' && canRooms && <PracticeRoomBookingView />}

      {/* 보강 레슨 추가 및 관리 모달 */}
      {showMakeupModal && (
        <Modal
          isOpen={showMakeupModal}
          onClose={() => setShowMakeupModal(false)}
          title="보강 레슨 일정 추가 및 관리"
          maxWidth="4xl"
        >
          <div className="p-1">
            <MakeupManagementView />
          </div>
        </Modal>
      )}
    </div>
  );
};
