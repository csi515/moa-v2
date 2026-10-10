import React, { useRef, useMemo, type FC, type DragEvent } from 'react';
import type {
  CalendarEngineMode,
  CalendarEventItem,
  CalendarResourceColumn,
  CalendarSlotTarget,
} from '../types';
import {
  formatDateIso,
  generateTimeSlots,
  toMinutes,
  toHhmm,
  JS_DAY_TO_DAY_OF_WEEK,
} from '../utils/calendarMath';

export interface CalendarDayViewProps<T = any> {
  mode: CalendarEngineMode;
  currentDate: Date;
  events: CalendarEventItem<T>[];
  resources?: CalendarResourceColumn[];
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
  onSlotClick?: (slot: CalendarSlotTarget) => void;
  onEventClick?: (event: CalendarEventItem<T>) => void;

  renderEventCard?: (event: CalendarEventItem<T>, view: 'day') => React.ReactNode;
  renderEmptySlot?: (slot: CalendarSlotTarget) => React.ReactNode;
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

export const CalendarDayView: FC<CalendarDayViewProps> = ({
  mode,
  currentDate,
  events,
  resources = [],
  startHour = 9,
  endHour = 22,
  slotInterval = 30,
  readOnly = false,
  onEventMove,
  onEventResize,
  onSlotClick,
  onEventClick,
  renderEventCard,
  renderEmptySlot,
}) => {
  const isTimetable = mode === 'recurring_timetable';
  const currentDateStr = formatDateIso(currentDate);
  const currentDow = JS_DAY_TO_DAY_OF_WEEK[currentDate.getDay()];

  const slots = useMemo(
    () => generateTimeSlots(startHour, endHour, slotInterval),
    [startHour, endHour, slotInterval]
  );

  // 오늘/해당 일자에 속하는 이벤트만 필터링
  const dayEvents = useMemo(() => {
    return events.filter((ev) => {
      if (isTimetable) {
        return ev.dayOfWeek === currentDow;
      }
      return ev.date === currentDateStr;
    });
  }, [events, isTimetable, currentDow, currentDateStr]);

  // 자원 컬럼 준비 (없으면 '전체' 단일 컬럼)
  const columns = useMemo(() => {
    if (resources.length > 0) return resources;
    return [{ id: 'default', name: '일정' }];
  }, [resources]);

  // 슬롯별 이벤트 맵핑
  const eventsByResourceAndSlot = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();

    for (const ev of dayEvents) {
      const resId =
        resources.length > 0
          ? ev.roomId || ev.staffId || 'default'
          : 'default';
      const slotKey = `${resId}_${ev.startTime}`;
      const list = map.get(slotKey) ?? [];
      list.push(ev);
      map.set(slotKey, list);
    }
    return map;
  }, [dayEvents, resources]);

  const resizingEventRef = useRef<{
    event: CalendarEventItem;
    startY: number;
    initialDuration: number;
  } | null>(null);

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

  const handleDrop = async (e: DragEvent, columnId: string, startTime: string) => {
    if (readOnly) return;
    e.preventDefault();
    const raw = e.dataTransfer.getData(DND_EVENT_MIME);
    if (!raw) return;

    try {
      const event: CalendarEventItem = JSON.parse(raw);
      const isRoomCol = resources.find((r) => r.id === columnId)?.category === 'room';
      const isStaffCol = resources.find((r) => r.id === columnId)?.category === 'staff';

      const target: CalendarSlotTarget = {
        date: isTimetable ? undefined : currentDateStr,
        dayOfWeek: currentDow,
        startTime,
        roomId: isRoomCol ? columnId : event.roomId,
        staffId: isStaffCol ? columnId : event.staffId,
      };

      if (event.startTime === startTime && (isTimetable ? true : event.date === currentDateStr)) {
        if (!isRoomCol && !isStaffCol) return;
      }

      await onEventMove?.(event, target);
    } catch {
      // ignore
    }
  };

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

    const handlePointerMove = (_moveEvent: PointerEvent) => {
      // 스냅 계산
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

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden select-none">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* 상단 자원 컬럼 헤더 */}
          <div
            className="grid border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold text-slate-700"
            style={{
              gridTemplateColumns: `72px repeat(${columns.length}, 1fr)`,
            }}
          >
            <div className="py-2.5 px-2 border-r border-slate-200 text-slate-400">시간</div>
            {columns.map((col) => (
              <div
                key={col.id}
                className="py-2.5 px-2 border-r border-slate-200 last:border-r-0 font-extrabold text-slate-800"
              >
                {col.name}
              </div>
            ))}
          </div>

          {/* 시간 슬롯 그리드 */}
          <div className="divide-y divide-slate-100">
            {slots.map((slotTime) => (
              <div
                key={slotTime}
                className="grid min-h-[52px]"
                style={{
                  gridTemplateColumns: `72px repeat(${columns.length}, 1fr)`,
                }}
              >
                {/* 시간 라벨 */}
                <div className="p-1.5 border-r border-slate-200 bg-slate-50/40 flex justify-center items-start pt-1.5">
                  <span
                    className={`font-mono text-[11px] font-bold ${
                      slotTime.endsWith(':30') ? 'text-slate-400 text-[10px]' : 'text-slate-700'
                    }`}
                  >
                    {slotTime}
                  </span>
                </div>

                {/* 컬럼별 슬롯 */}
                {columns.map((col) => {
                  const slotKey = `${col.id}_${slotTime}`;
                  const cellEvents = eventsByResourceAndSlot.get(slotKey) ?? [];

                  return (
                    <div
                      key={col.id}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, col.id, slotTime)}
                      onClick={() =>
                        onSlotClick?.({
                          date: isTimetable ? undefined : currentDateStr,
                          dayOfWeek: currentDow,
                          startTime: slotTime,
                          roomId: col.category === 'room' ? col.id : undefined,
                          staffId: col.category === 'staff' ? col.id : undefined,
                        })
                      }
                      className="p-1 border-r border-slate-100 last:border-r-0 space-y-1 relative hover:bg-slate-50/80 transition-colors"
                    >
                      {cellEvents.length === 0 ? (
                        renderEmptySlot ? (
                          renderEmptySlot({
                            date: isTimetable ? undefined : currentDateStr,
                            dayOfWeek: currentDow,
                            startTime: slotTime,
                            roomId: col.category === 'room' ? col.id : undefined,
                            staffId: col.category === 'staff' ? col.id : undefined,
                          })
                        ) : null
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
                                {renderEventCard(ev, 'day')}
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
