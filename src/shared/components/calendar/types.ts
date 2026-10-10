import type { ReactNode } from 'react';
import type { DayOfWeek } from '@/types';

export type CalendarViewMode = 'month' | 'week' | 'day';
export type CalendarEngineMode = 'recurring_timetable' | 'appointment_timeline';

export interface CalendarEventItem<T = any> {
  id: string;
  title: string;
  subtitle?: string;

  /** 날짜: 'YYYY-MM-DD' (appointment_timeline 및 month 뷰) */
  date?: string;

  /** 요일: '월' ~ '일' (recurring_timetable) */
  dayOfWeek?: DayOfWeek;

  /** 시작시각: 'HH:mm' (예: '10:00') */
  startTime: string;

  /** 종료시각: 'HH:mm' (예: '11:00') */
  endTime: string;

  /** 배정 스태프 */
  staffId?: string;
  staffName?: string;

  /** 배정 공간/룸 */
  roomId?: string;
  roomName?: string;

  /** 상태 및 스타일 */
  status?: string;
  colorTheme?: 'indigo' | 'teal' | 'rose' | 'amber' | 'slate' | 'emerald';

  /** 인터랙션 제어 */
  isDraggable?: boolean;
  isResizable?: boolean;

  /** 정원 메타데이터 (정원 뱃지용) */
  capacity?: {
    current: number;
    max: number;
    isClosed?: boolean;
  };

  /** 원본 도메인 엔터티 객체 */
  raw: T;
}

export interface CalendarResourceColumn {
  id: string;
  name: string;
  category?: 'staff' | 'room';
}

export interface CalendarTimeConfig {
  startHour?: number; // 기본: 9 (09:00)
  endHour?: number; // 기본: 22 (22:00)
  slotInterval?: number; // 분 단위: 15 | 30 | 60 (기본: 30)
}

export interface CalendarSlotTarget {
  date?: string;
  dayOfWeek?: DayOfWeek;
  startTime: string;
  staffId?: string;
  roomId?: string;
}

export interface CalendarRangeTarget {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
}

export interface UnifiedScheduleCalendarProps<T = any> {
  /** 캘린더 동작 모드: 고정 요일제 시간표 or 일자 기반 타임라인 */
  mode: CalendarEngineMode;

  /** 현재 기준 일자 (기본값: 오늘) */
  currentDate?: Date;
  onDateChange?: (date: Date) => void;

  /** 현재 활성 뷰: 월간 | 주간 | 일간 */
  currentView?: CalendarViewMode;
  onViewChange?: (view: CalendarViewMode) => void;

  /** 허용 뷰 목록 (기본: ['month', 'week', 'day']) */
  availableViews?: CalendarViewMode[];

  /** 일정 이벤트 목록 */
  events: CalendarEventItem<T>[];

  /** 일간(Day) 뷰에서 컬럼으로 분할 표출할 자원 목록 */
  resources?: CalendarResourceColumn[];

  /** 시간축 설정 */
  timeConfig?: CalendarTimeConfig;

  /** 이벤트 드래그 앤 드롭 이동 핸들러 */
  onEventMove?: (
    event: CalendarEventItem<T>,
    target: CalendarSlotTarget
  ) => Promise<boolean | void>;

  /** 이벤트 하단 핸들 드래그 시간 연장/단축 핸들러 */
  onEventResize?: (
    event: CalendarEventItem<T>,
    target: { endTime: string }
  ) => Promise<boolean | void>;

  /** 외부 요소(예: 미배치 학생 풀 등) 드래그 드롭 핸들러 */
  onExternalDrop?: (
    e: React.DragEvent,
    target: CalendarSlotTarget
  ) => Promise<boolean | void> | void;

  /** 빈 슬롯 클릭 */
  onSlotClick?: (slot: CalendarSlotTarget) => void;

  /** 이벤트 카드 클릭 */
  onEventClick?: (event: CalendarEventItem<T>) => void;

  /** 빈 슬롯 연속 드래그 다중 일정 일괄 생성 모달 트리거 */
  onRangeSelect?: (range: CalendarRangeTarget) => void;

  /** 카드 커스텀 렌더러 */
  renderEventCard?: (
    event: CalendarEventItem<T>,
    view: CalendarViewMode
  ) => ReactNode;

  /** 빈 슬롯 커스텀 렌더러 */
  renderEmptySlot?: (slot: CalendarSlotTarget) => ReactNode;

  /** 드래그 이동 전 사용자 확인 정책 (예: 피아노 새 반 생성 확인 모달) */
  confirmBeforeMove?: (
    event: CalendarEventItem<T>,
    target: CalendarSlotTarget
  ) => Promise<boolean>;

  /** 읽기 전용 여부 */
  readOnly?: boolean;

  className?: string;
}
