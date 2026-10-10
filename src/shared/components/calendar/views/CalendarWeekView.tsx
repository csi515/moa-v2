import React, { useState, useRef, useMemo, type FC, type DragEvent } from 'react';
import type {
  CalendarEngineMode,
  CalendarEventItem,
  CalendarSlotTarget,
  CalendarRangeTarget,
} from '../types';
import {
  DAYS_OF_WEEK,
  generateTimeSlots,
  getWeekDaysForDate,
  toMinutes,
  toHhmm,
  type WeekDayInfo,
} from '../utils/calendarMath';
import type { DayOfWeek } from '@/types';

export interface CalendarWeekViewProps<T = any> {
  mode: CalendarEngineMode;
  currentDate: Date;
  events: CalendarEventItem<T>[];
  startHour?: number;
  endHour?: number;
  slotInterval?: number;
  readOnly?: boolean;

  onEventMove?: (
    event: CalendarEventItem<T>,
    target: CalendarSlotTarget
  ) => Promise<boolean | void>;
  onEventResize?: (
    event: CalendarEventItem<T>,
    target: { endTime: string }
  ) => Promise<boolean | void>;
  onExternalDrop?: (
    e: React.DragEvent,
    target: CalendarSlotTarget
  ) => Promise<boolean | void> | void;
  onSlotClick?: (slot: CalendarSlotTarget) => void;
  onEventClick?: (event: CalendarEventItem<T>) => void;
  onRangeSelect?: (range: CalendarRangeTarget) => void;

  renderEventCard?: (event: CalendarEventItem<T>, view: 'week') => React.ReactNode;
  renderEmptySlot?: (slot: CalendarSlotTarget) => React.ReactNode;
  confirmBeforeMove?: (
    event: CalendarEventItem<T>,
    target: CalendarSlotTarget
  ) => Promise<boolean>;
}

const DND_EVENT_MIME = 'application/x-moa-calendar-event';

const COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
  indigo: { bg: 'bg-indigo-50/95', text: 'text-indigo-900', border: 'border-indigo-200' },
  teal: { bg: 'bg-teal-50/95', text: 'text-teal-900', border: 'border-teal-200' },
  rose: { bg: 'bg-rose-50/95', text: 'text-rose-900', border: 'border-rose-200' },
  amber: { bg: 'bg-amber-50/95', text: 'text-amber-900', border: 'border-amber-200' },
  emerald: { bg: 'bg-emerald-50/95', text: 'text-emerald-900', border: 'border-emerald-200' },
  slate: { bg: 'bg-slate-50/95', text: 'text-slate-900', border: 'border-slate-200' },
};

export const CalendarWeekView: FC<CalendarWeekViewProps> = ({
  mode,
  currentDate,
  events,
  startHour = 9,
  endHour = 22,
  slotInterval = 30,
  readOnly = false,
  onEventMove,
  onEventResize,
  onExternalDrop,
  onSlotClick,
  onEventClick,
  onRangeSelect,
  renderEventCard,
  renderEmptySlot,
  confirmBeforeMove,
}) => {
  const isTimetable = mode === 'recurring_timetable';
  const slots = useMemo(
    () => generateTimeSlots(startHour, endHour, slotInterval),
    [startHour, endHour, slotInterval]
  );
  const weekDays: WeekDayInfo[] = useMemo(
    () => getWeekDaysForDate(currentDate),
    [currentDate]
  );

  // 빈 슬롯 다중 드래그 선택 상태
  const [rangeStartSlot, setRangeStartSlot] = useState<{
    date?: string;
    dayOfWeek?: DayOfWeek;
    startTime: string;
  } | null>(null);
  const [rangeEndSlot, setRangeEndSlot] = useState<{
    date?: string;
    dayOfWeek?: DayOfWeek;
    startTime: string;
  } | null>(null);

  // 리사이즈 관련 상태
  const resizingEventRef = useRef<{
    event: CalendarEventItem;
    startY: number;
    initialDuration: number;
  } | null>(null);

  // 컬럼별/시간별 이벤트 맵핑 인덱스
  const eventsByColumnAndSlot = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();

    for (const ev of events) {
      const colKey = isTimetable ? ev.dayOfWeek : ev.date;
      if (!colKey) continue;

      const slotKey = `${colKey}_${ev.startTime}`;
      const list = map.get(slotKey) ?? [];
      list.push(ev);
      map.set(slotKey, list);
    }
    return map;
  }, [events, isTimetable]);

  // 드래그 앤 드롭 핸들러
  const handleDragStart = (e: DragEvent, ev: CalendarEventItem) => {
    if (readOnly || ev.isDraggable === false) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData(DND_EVENT_MIME, JSON.stringify(ev));
    e.dataTransfer.setData('text/plain', ev.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (
    e: DragEvent,
    colInfo: { date?: string; dayOfWeek: DayOfWeek },
    startTime: string
  ) => {
    if (readOnly) return;
    e.preventDefault();
    const rawData = e.dataTransfer.getData(DND_EVENT_MIME);
    if (!rawData) {
      if (onExternalDrop) {
        const target: CalendarSlotTarget = {
          date: isTimetable ? undefined : colInfo.date,
          dayOfWeek: colInfo.dayOfWeek,
          startTime,
        };
        await onExternalDrop(e, target);
      }
      return;
    }

    try {
      const event: CalendarEventItem = JSON.parse(rawData);
      const target: CalendarSlotTarget = {
        date: isTimetable ? undefined : colInfo.date,
        dayOfWeek: colInfo.dayOfWeek,
        startTime,
      };

      // 위치가 완전히 동일하면 무시
      const isSameDay = isTimetable
        ? event.dayOfWeek === target.dayOfWeek
        : event.date === target.date;
      if (isSameDay && event.startTime === target.startTime) return;

      // 확인 정책 (Confirm dialog)
      if (confirmBeforeMove) {
        const confirmed = await confirmBeforeMove(event, target);
        if (!confirmed) return;
      }

      await onEventMove?.(event, target);
    } catch {
      // JSON 파싱 실패 무시
    }
  };

  // 리사이즈 포인터 핸들러
  const handleResizeStart = (e: React.PointerEvent, ev: CalendarEventItem) => {
    if (readOnly || ev.isResizable === false) return;
    e.stopPropagation();
    e.preventDefault();

    const startMin = toMinutes(ev.startTime);
    const endMin = toMinutes(ev.endTime);
    resizingEventRef.current = {
      event: ev,
      startY: e.clientY,
      initialDuration: Math.max(slotInterval, endMin - startMin),
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      // 30분 슬롯당 대략 48px 높이 기준 스냅
      if (!resizingEventRef.current) return;
      const deltaY = moveEvent.clientY - resizingEventRef.current.startY;
      const slotDelta = Math.round(deltaY / 48);
      const newDuration = Math.max(
        slotInterval,
        resizingEventRef.current.initialDuration + slotDelta * slotInterval
      );
      const newEndMin = toMinutes(resizingEventRef.current.event.startTime) + newDuration;
      // 상한 제한
      if (newEndMin <= endHour * 60) {
        // 프리뷰 처리 가능
      }
    };

    const handlePointerUp = async (upEvent: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (!resizingEventRef.current) return;
      const deltaY = upEvent.clientY - resizingEventRef.current.startY;
      const slotDelta = Math.round(deltaY / 48);
      const newDuration = Math.max(
        slotInterval,
        resizingEventRef.current.initialDuration + slotDelta * slotInterval
      );
      const newEndMin = Math.min(
        endHour * 60,
        toMinutes(resizingEventRef.current.event.startTime) + newDuration
      );
      const finalEndTime = toHhmm(newEndMin);

      const targetEv = resizingEventRef.current.event;
      resizingEventRef.current = null;

      if (finalEndTime !== targetEv.endTime) {
        await onEventResize?.(targetEv, { endTime: finalEndTime });
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // 다중 슬롯 범위 선택 시작
  const handleSlotMouseDown = (
    colInfo: { date?: string; dayOfWeek: DayOfWeek },
    startTime: string
  ) => {
    if (readOnly) return;
    setRangeStartSlot({
      date: colInfo.date,
      dayOfWeek: colInfo.dayOfWeek,
      startTime,
    });
    setRangeEndSlot({
      date: colInfo.date,
      dayOfWeek: colInfo.dayOfWeek,
      startTime,
    });
  };

  const handleSlotMouseEnter = (
    colInfo: { date?: string; dayOfWeek: DayOfWeek },
    startTime: string
  ) => {
    if (!rangeStartSlot) return;
    setRangeEndSlot({
      date: colInfo.date,
      dayOfWeek: colInfo.dayOfWeek,
      startTime,
    });
  };

  const handleGridMouseUp = () => {
    if (rangeStartSlot && rangeEndSlot) {
      const isSameDate = rangeStartSlot.date === rangeEndSlot.date;
      const isSameDow = rangeStartSlot.dayOfWeek === rangeEndSlot.dayOfWeek;
      const isSingleClick =
        rangeStartSlot.startTime === rangeEndSlot.startTime &&
        (isTimetable ? isSameDow : isSameDate);

      if (isSingleClick) {
        onSlotClick?.({
          date: rangeStartSlot.date,
          dayOfWeek: rangeStartSlot.dayOfWeek,
          startTime: rangeStartSlot.startTime,
        });
      } else {
        // 범위 드래그 선택
        const startMin = Math.min(
          toMinutes(rangeStartSlot.startTime),
          toMinutes(rangeEndSlot.startTime)
        );
        const endMin = Math.max(
          toMinutes(rangeStartSlot.startTime),
          toMinutes(rangeEndSlot.startTime)
        ) + slotInterval;

        onRangeSelect?.({
          startDate: rangeStartSlot.date || '',
          endDate: rangeEndSlot.date || rangeStartSlot.date || '',
          startTime: toHhmm(startMin),
          endTime: toHhmm(endMin),
        });
      }
    }
    setRangeStartSlot(null);
    setRangeEndSlot(null);
  };

  return (
    <div
      onMouseUp={handleGridMouseUp}
      className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden select-none"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[840px]">
          {/* 상단 컬럼 헤더 */}
          <div className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-700">
            <div className="py-2.5 px-2 border-r border-slate-200 text-slate-400">
              시간
            </div>
            {isTimetable
              ? DAYS_OF_WEEK.map((dow) => (
                  <div
                    key={dow}
                    className="py-2.5 px-2 border-r border-slate-200 last:border-r-0 font-extrabold text-slate-800"
                  >
                    {dow}요일
                  </div>
                ))
              : weekDays.map((w) => (
                  <div
                    key={w.date}
                    className={`py-2 px-2 border-r border-slate-200 last:border-r-0 ${
                      w.isToday ? 'bg-indigo-50/80 text-indigo-700 font-black' : ''
                    }`}
                  >
                    <div className="text-[11px] text-slate-500 font-semibold">{w.dayOfWeek}</div>
                    <div className="text-sm font-extrabold">{w.dayNumber}</div>
                  </div>
                ))}
          </div>

          {/* 시간 슬롯 매트릭스 그리드 */}
          <div className="divide-y divide-slate-100">
            {slots.map((slotTime) => (
              <div
                key={slotTime}
                className="grid grid-cols-[72px_repeat(7,1fr)] min-h-[52px]"
              >
                {/* 좌측 시간 라벨 */}
                <div className="p-1.5 border-r border-slate-200 bg-slate-50/40 flex justify-center items-start pt-1.5">
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      slotTime.endsWith(':30') ? 'text-slate-400 text-[10px]' : 'text-slate-700'
                    }`}
                  >
                    {slotTime}
                  </span>
                </div>

                {/* 7개 컬럼 셀 */}
                {(isTimetable
                  ? DAYS_OF_WEEK.map((dow) => ({ dayOfWeek: dow, date: undefined }))
                  : weekDays.map((w) => ({ dayOfWeek: w.dayOfWeek, date: w.date }))
                ).map((colInfo) => {
                  const colKey = isTimetable ? colInfo.dayOfWeek : colInfo.date;
                  const slotKey = `${colKey}_${slotTime}`;
                  const cellEvents = eventsByColumnAndSlot.get(slotKey) ?? [];

                  return (
                    <div
                      key={colKey}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, colInfo, slotTime)}
                      onMouseDown={() => handleSlotMouseDown(colInfo, slotTime)}
                      onMouseEnter={() => handleSlotMouseEnter(colInfo, slotTime)}
                      className="p-1 border-r border-slate-100 last:border-r-0 space-y-1 relative hover:bg-slate-50/80 transition-colors"
                    >
                      {cellEvents.length === 0 ? (
                        renderEmptySlot ? (
                          renderEmptySlot({
                            date: colInfo.date,
                            dayOfWeek: colInfo.dayOfWeek,
                            startTime: slotTime,
                          })
                        ) : (
                          <div className="h-full min-h-[44px] rounded-lg border border-dashed border-slate-100 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-slate-300 font-semibold">+ 추가</span>
                          </div>
                        )
                      ) : (
                        cellEvents.map((ev) => {
                          if (renderEventCard) {
                            return (
                              <div
                                key={ev.id}
                                draggable={!readOnly && ev.isDraggable !== false}
                                onDragStart={(e) => handleDragStart(e, ev)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEventClick?.(ev);
                                }}
                                className="relative group cursor-grab active:cursor-grabbing"
                              >
                                {renderEventCard(ev, 'week')}
                                {!readOnly && ev.isResizable !== false && (
                                  <div
                                    onPointerDown={(e) => handleResizeStart(e, ev)}
                                    className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-slate-300 hover:bg-indigo-500 rounded-b transition-all"
                                  />
                                )}
                              </div>
                            );
                          }

                          const theme = COLOR_MAP[ev.colorTheme || 'teal'];
                          return (
                            <div
                              key={ev.id}
                              draggable={!readOnly && ev.isDraggable !== false}
                              onDragStart={(e) => handleDragStart(e, ev)}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(ev);
                              }}
                              className={`p-2 rounded-xl border shadow-2xs relative group transition-all cursor-grab active:cursor-grabbing ${theme.bg} ${theme.border}`}
                            >
                              <div className="flex items-start justify-between gap-1">
                                <p className={`text-xs font-black truncate ${theme.text}`}>
                                  {ev.title}
                                </p>
                                {ev.capacity && (
                                  <span className="text-[9px] font-bold px-1 rounded bg-white/80 text-slate-700 shrink-0">
                                    {ev.capacity.current}/{ev.capacity.max}
                                  </span>
                                )}
                              </div>
                              {ev.subtitle && (
                                <p className="text-[10px] text-slate-600 truncate mt-0.5">
                                  {ev.subtitle}
                                </p>
                              )}
                              <p className="text-[9px] font-mono text-slate-600 mt-1">
                                {ev.startTime} ~ {ev.endTime}
                              </p>

                              {/* 하단 리사이즈 핸들 */}
                              {!readOnly && ev.isResizable !== false && (
                                <div
                                  onPointerDown={(e) => handleResizeStart(e, ev)}
                                  className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-slate-300 hover:bg-indigo-500 rounded-b transition-all"
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
