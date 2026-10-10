import { useState, useCallback, type FC } from 'react';
import type {
  CalendarViewMode,
  UnifiedScheduleCalendarProps,
} from './types';
import { CalendarHeader } from './components/CalendarHeader';
import { CalendarMonthView } from './views/CalendarMonthView';
import { CalendarWeekView } from './views/CalendarWeekView';
import { CalendarDayView } from './views/CalendarDayView';

/**
 * MOA v2 단일 통합 캘린더 엔진 (UnifiedScheduleCalendar)
 *
 * "Single Engine, Policy-Driven"
 * - 모드 A: recurring_timetable (주간 고정 시간표 모드 - 피아노 등 클래스 기반)
 * - 모드 B: appointment_timeline (자율 예약 타임라인 모드 - 필라테스/피부/연습실 등 슬롯 기반)
 *
 * 지원 기능:
 * 1. 월간(도트 요약 + Drill-down) / 주간(시간대 x 요일 매트릭스) / 일간(자원별 타임라인) 원클릭 전환
 * 2. 마우스 드래그를 통한 일정 이동 (Event Drop) 및 하단 핸들 드래그 시간 조절 (Event Resize)
 * 3. 빈 슬롯 연속 드래그 다중 일정 일괄 생성 모달 트리거 (onRangeSelect)
 * 4. 카드 커스텀 슬롯 렌더러 (renderEventCard)
 * 5. 이동 전 확인 정책 주입 (confirmBeforeMove)
 */
export function UnifiedScheduleCalendar<T = any>({
  mode,
  currentDate: externalDate,
  onDateChange,
  currentView: externalView,
  onViewChange,
  availableViews: externalAvailableViews,
  events,
  resources,
  timeConfig,
  onEventMove,
  onEventResize,
  onExternalDrop,
  onSlotClick,
  onEventClick,
  onRangeSelect,
  renderEventCard,
  renderEmptySlot,
  confirmBeforeMove,
  readOnly = false,
  className = '',
}: UnifiedScheduleCalendarProps<T>) {
  const isTimetable = mode === 'recurring_timetable';

  // 가용 뷰 모드 결정
  const availableViews =
    externalAvailableViews ??
    (isTimetable ? (['week', 'day'] as CalendarViewMode[]) : (['month', 'week', 'day'] as CalendarViewMode[]));

  // 현재 날짜 관리 (controlled or uncontrolled)
  const [internalDate, setInternalDate] = useState<Date>(() => new Date());
  const currentDate = externalDate ?? internalDate;

  const handleDateChange = useCallback(
    (newDate: Date) => {
      if (onDateChange) {
        onDateChange(newDate);
      } else {
        setInternalDate(newDate);
      }
    },
    [onDateChange]
  );

  // 현재 뷰 관리 (controlled or uncontrolled)
  const [internalView, setInternalView] = useState<CalendarViewMode>(() =>
    availableViews.includes('week') ? 'week' : availableViews[0]
  );
  const currentView = externalView ?? internalView;

  const handleViewChange = useCallback(
    (newView: CalendarViewMode) => {
      if (onViewChange) {
        onViewChange(newView);
      } else {
        setInternalView(newView);
      }
    },
    [onViewChange]
  );

  // 날짜 네비게이션
  const handlePrev = useCallback(() => {
    const next = new Date(currentDate);
    if (currentView === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (currentView === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    handleDateChange(next);
  }, [currentDate, currentView, handleDateChange]);

  const handleNext = useCallback(() => {
    const next = new Date(currentDate);
    if (currentView === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (currentView === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    handleDateChange(next);
  }, [currentDate, currentView, handleDateChange]);

  const handleToday = useCallback(() => {
    handleDateChange(new Date());
  }, [handleDateChange]);

  // 월간 뷰에서 날짜 셀 클릭 시 일간 뷰로 Drill-down
  const handleMonthSelectDate = useCallback(
    (selectedDate: Date) => {
      handleDateChange(selectedDate);
      if (availableViews.includes('day')) {
        handleViewChange('day');
      }
    },
    [handleDateChange, handleViewChange, availableViews]
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 캘린더 상단 헤더 & 뷰 스위처 */}
      <CalendarHeader
        mode={mode}
        currentDate={currentDate}
        currentView={currentView}
        availableViews={availableViews}
        onViewChange={handleViewChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      {/* 뷰 본문 */}
      {currentView === 'month' && (
        <CalendarMonthView
          currentDate={currentDate}
          events={events}
          onSelectDate={handleMonthSelectDate}
          onEventClick={onEventClick}
          renderEventCard={renderEventCard}
        />
      )}

      {currentView === 'week' && (
        <CalendarWeekView
          mode={mode}
          currentDate={currentDate}
          events={events}
          startHour={timeConfig?.startHour ?? 9}
          endHour={timeConfig?.endHour ?? 22}
          slotInterval={timeConfig?.slotInterval ?? 30}
          readOnly={readOnly}
          onEventMove={onEventMove}
          onEventResize={onEventResize}
          onExternalDrop={onExternalDrop}
          onSlotClick={onSlotClick}
          onEventClick={onEventClick}
          onRangeSelect={onRangeSelect}
          renderEventCard={renderEventCard}
          renderEmptySlot={renderEmptySlot}
          confirmBeforeMove={confirmBeforeMove}
        />
      )}

      {currentView === 'day' && (
        <CalendarDayView
          mode={mode}
          currentDate={currentDate}
          events={events}
          resources={resources}
          startHour={timeConfig?.startHour ?? 9}
          endHour={timeConfig?.endHour ?? 22}
          slotInterval={timeConfig?.slotInterval ?? 30}
          readOnly={readOnly}
          onEventMove={onEventMove}
          onEventResize={onEventResize}
          onSlotClick={onSlotClick}
          onEventClick={onEventClick}
          renderEventCard={renderEventCard}
          renderEmptySlot={renderEmptySlot}
        />
      )}
    </div>
  );
};
