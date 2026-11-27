import React from 'react';
import { WorkplaceCalendarView, type CalendarEventTypeOption } from '@/capabilities/scheduling/calendar';
import { useStaffScope } from '@/hooks';
import { visibleStaffCalendarEvents } from './visibleStaffCalendarEvents';

const PIANO_EVENT_TYPE_OPTIONS: CalendarEventTypeOption[] = [
  { value: 'concert', label: '정기 연주회' },
  { value: 'competition', label: '콩쿠르 출전' },
  { value: 'special_lesson', label: '특강/골든벨' },
  { value: 'tuning', label: '피아노 조율' },
  { value: 'vacation', label: '방학/휴원' },
  { value: 'personal', label: '개인 일정' },
  { value: 'other', label: '기타' },
];

export const AcademyCalendarView: React.FC<{ embedded?: boolean }> = ({
  embedded = false,
}) => {
  const { scopeRecitalEvents } = useStaffScope();

  return (
    <WorkplaceCalendarView
      embedded={embedded}
      eventTypeOptions={PIANO_EVENT_TYPE_OPTIONS}
      defaultEventType="concert"
      enableParticipationFee={true}
      participationFeeHint="설정에서 「월 청구에 교재·연주회비 합산」을 켠 경우, 참가 원생 월회비에 포함됩니다."
      filterVisibleEvents={(events, students, isScoped) =>
        visibleStaffCalendarEvents(events, students, isScoped, scopeRecitalEvents)
      }
    />
  );
};
