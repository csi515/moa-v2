import React, { useState, useRef, useMemo, type FC, type DragEvent } from 'react';
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
} from '../utils/calendarMath';
import {
  computeEventPosition,
  snapPercentToTime,
  calculateResourceOccupancy,
  TimelineConfig,
} from '@/capabilities/scheduling/domain/timelineGridEngine';
import { Clock, User, ShieldAlert, Sparkles } from 'lucide-react';

export interface CalendarResourceTimelineViewProps<T = any> {
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

  renderEventCard?: (event: CalendarEventItem<T>, view: 'timeline') => React.ReactNode;
}

const DND_EVENT_MIME = 'application/x-moa-calendar-event';

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  indigo: { bg: 'bg-slate-50/95', text: 'text-slate-950', border: 'border-slate-300', accent: 'bg-slate-900' },
  teal: { bg: 'bg-teal-50/95', text: 'text-teal-950', border: 'border-teal-300', accent: 'bg-teal-600' },
  rose: { bg: 'bg-rose-50/95', text: 'text-rose-950', border: 'border-rose-300', accent: 'bg-rose-600' },
  amber: { bg: 'bg-amber-50/95', text: 'text-amber-950', border: 'border-amber-300', accent: 'bg-amber-600' },
  emerald: { bg: 'bg-emerald-50/95', text: 'text-emerald-950', border: 'border-emerald-300', accent: 'bg-emerald-600' },
  slate: { bg: 'bg-slate-50/95', text: 'text-slate-950', border: 'border-slate-300', accent: 'bg-slate-600' },
  purple: { bg: 'bg-slate-50/95', text: 'text-slate-950', border: 'border-slate-300', accent: 'bg-slate-900' },
  blue: { bg: 'bg-blue-50/95', text: 'text-blue-950', border: 'border-blue-300', accent: 'bg-blue-600' },
};

export const CalendarResourceTimelineView: FC<CalendarResourceTimelineViewProps> = ({
  mode,
  currentDate,
  events,
  resources = [],
  startHour = 8,
  endHour = 22,
  slotInterval = 30,
  readOnly = false,
  onEventMove,
  onEventResize,
  onSlotClick,
  onEventClick,
  renderEventCard,
}) => {
  const currentDateStr = formatDateIso(currentDate);

  const timelineConfig: TimelineConfig = useMemo(
    () => ({
      startHour,
      endHour,
      slotIntervalMinutes: slotInterval,
    }),
    [startHour, endHour, slotInterval]
  );

  // 시간 슬롯 헤더 목록 (예: ['08:00', '09:00', ...])
  const hourHeaders = useMemo(() => {
    const list: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      list.push(`${String(h).padStart(2, '0')}:00`);
    }
    return list;
  }, [startHour, endHour]);

  // 오늘 날짜에 해당하는 이벤트만 필터링
  const dayEvents = useMemo(() => {
    return events.filter((ev) => ev.date === currentDateStr || !ev.date);
  }, [events, currentDateStr]);

  // 자원 목록 (없으면 '전체' 단일 리소스)
  const columns = useMemo(() => {
    if (resources.length > 0) return resources;
    return [{ id: 'default', name: '전체 자원' }];
  }, [resources]);

  // 리소스별 이벤트 맵핑
  const eventsByResource = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const col of columns) {
      map.set(col.id, []);
    }

    for (const ev of dayEvents) {
      const resId = ev.roomId || ev.staffId || 'default';
      const targetList = map.get(resId) || (columns.length > 0 ? map.get(columns[0].id) : null);
      if (targetList) {
        targetList.push(ev);
      }
    }
    return map;
  }, [columns, dayEvents]);

  // 드래그 상태 관리
  const [dragOverResourceId, setDragOverResourceId] = useState<string | null>(null);
  const [dragOverTime, setDragOverTime] = useState<string | null>(null);

  const handleDragStart = (e: DragEvent, event: CalendarEventItem) => {
    if (readOnly) return;
    e.dataTransfer.setData(DND_EVENT_MIME, JSON.stringify(event));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrackDragOver = (e: DragEvent<HTMLDivElement>, resourceId: string) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = (offsetX / rect.width) * 100;
    const snappedTime = snapPercentToTime(percent, timelineConfig);

    setDragOverResourceId(resourceId);
    setDragOverTime(snappedTime);
  };

  const handleTrackDragLeave = () => {
    setDragOverResourceId(null);
    setDragOverTime(null);
  };

  const handleTrackDrop = async (e: DragEvent<HTMLDivElement>, resource: CalendarResourceColumn) => {
    if (readOnly) return;
    e.preventDefault();
    setDragOverResourceId(null);
    setDragOverTime(null);

    const rawData = e.dataTransfer.getData(DND_EVENT_MIME);
    if (!rawData) return;

    try {
      const event: CalendarEventItem = JSON.parse(rawData);
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percent = (offsetX / rect.width) * 100;
      const startTime = snapPercentToTime(percent, timelineConfig);

      const target: CalendarSlotTarget = {
        date: currentDateStr,
        startTime,
        staffId: resource.category === 'staff' ? resource.id : undefined,
        roomId: resource.category === 'room' ? resource.id : undefined,
      };

      if (onEventMove) {
        await onEventMove(event, target);
      }
    } catch (err) {
      console.error('Drag drop failed:', err);
    }
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>, resource: CalendarResourceColumn) => {
    if (readOnly || !onSlotClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const percent = (offsetX / rect.width) * 100;
    const startTime = snapPercentToTime(percent, timelineConfig);

    onSlotClick({
      date: currentDateStr,
      startTime,
      staffId: resource.category === 'staff' ? resource.id : undefined,
      roomId: resource.category === 'room' ? resource.id : undefined,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden select-none">
      {/* 타임라인 메인 스크롤 컨테이너 */}
      <div className="overflow-x-auto min-w-full">
        <div style={{ minWidth: '980px' }}>
          {/* 1. 상단 시간 헤더 행 */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 sticky top-0 z-20">
            {/* 좌측 리소스 헤더 타이틀 */}
            <div className="w-48 sm:w-56 shrink-0 p-3.5 border-r border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                자원/담당자 ({columns.length})
              </span>
              <span className="text-[11px] text-slate-500 font-medium">가동률</span>
            </div>

            {/* 가로 시간 눈금 축 */}
            <div className="flex-1 flex relative">
              {hourHeaders.map((hourStr, idx) => (
                <div
                  key={idx}
                  className="flex-1 py-3 px-1 text-center border-r border-slate-200/60 last:border-r-0"
                >
                  <span className="text-xs font-semibold text-slate-600">{hourStr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 리소스별 행 (매트릭스 트랙) */}
          <div className="divide-y divide-slate-100">
            {columns.map((resource) => {
              const resEvents = eventsByResource.get(resource.id) || [];
              const occupancy = calculateResourceOccupancy(resource.id, resEvents, timelineConfig);
              const isOver = dragOverResourceId === resource.id;

              return (
                <div key={resource.id} className="flex min-h-[76px] transition-colors hover:bg-slate-50/40">
                  {/* 좌측: 리소스 정보 카드 */}
                  <div className="w-48 sm:w-56 shrink-0 p-3 border-r border-slate-200 flex flex-col justify-center bg-white">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {resource.name}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          occupancy.occupancyRatePercent >= 80
                            ? 'bg-rose-100 text-rose-700'
                            : occupancy.occupancyRatePercent >= 40
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {occupancy.occupancyRatePercent}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{resource.category === 'room' ? '공간' : '스태프'}</span>
                      <span>•</span>
                      <span>예약 {resEvents.length}건</span>
                    </div>
                  </div>

                  {/* 우측: 시간 트랙 (그리드 및 이벤트 막대) */}
                  <div
                    className={`flex-1 relative cursor-pointer ${
                      isOver ? 'bg-slate-50/50 ring-2 ring-slate-400 ring-inset' : ''
                    }`}
                    onDragOver={(e) => handleTrackDragOver(e, resource.id)}
                    onDragLeave={handleTrackDragLeave}
                    onDrop={(e) => handleTrackDrop(e, resource)}
                    onClick={(e) => handleTrackClick(e, resource)}
                  >
                    {/* 세로 격자 그리드 라인 */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {hourHeaders.map((_, idx) => (
                        <div
                          key={idx}
                          className="flex-1 border-r border-slate-100/90 last:border-r-0"
                        />
                      ))}
                    </div>

                    {/* 드래그 호버 시 시간 가이드 툴팁 */}
                    {isOver && dragOverTime && (
                      <div
                        className="absolute top-1 z-30 px-2 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold shadow-md pointer-events-none transition-all"
                        style={{
                          left: `${computeEventPosition(dragOverTime, dragOverTime, timelineConfig).leftPercent}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {dragOverTime}
                      </div>
                    )}

                    {/* 이벤트 막대 블록 렌더링 */}
                    {resEvents.map((ev) => {
                      const pos = computeEventPosition(ev.startTime, ev.endTime, timelineConfig);
                      const theme = COLOR_MAP[ev.colorTheme || 'indigo'] || COLOR_MAP.indigo;

                      return (
                        <div
                          key={ev.id}
                          draggable={!readOnly && ev.isDraggable !== false}
                          onDragStart={(e) => {
                            e.stopPropagation();
                            handleDragStart(e, ev);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onEventClick) onEventClick(ev);
                          }}
                          style={{
                            left: `${pos.leftPercent}%`,
                            width: `${Math.max(2.5, pos.widthPercent)}%`,
                            top: '8px',
                            bottom: '8px',
                          }}
                          className={`absolute z-10 rounded-xl border ${theme.border} ${theme.bg} ${theme.text} p-2 shadow-xs flex flex-col justify-between overflow-hidden cursor-move transition-transform active:scale-[0.99] group`}
                        >
                          {/* 상단: 시작~종료 시각 + 정원 */}
                          <div className="flex items-center justify-between text-[11px] font-bold leading-tight">
                            <span className="truncate">
                              {ev.startTime}~{ev.endTime}
                            </span>
                            {ev.capacity && (
                              <span className="shrink-0 bg-white/80 px-1.5 py-0.2 rounded text-[10px]">
                                {ev.capacity.current}/{ev.capacity.max}
                              </span>
                            )}
                          </div>

                          {/* 중단: 타이틀 (고객명 / 서비스명) */}
                          <div className="text-xs font-extrabold truncate">
                            {ev.title}
                          </div>

                          {/* 하단: 서브타이틀 (시술/옵션) */}
                          {ev.subtitle && (
                            <div className="text-[10px] opacity-80 truncate">
                              {ev.subtitle}
                            </div>
                          )}

                          {/* 우측 리사이징 핸들 (Drag to resize duration) */}
                          {!readOnly && ev.isResizable !== false && (
                            <div
                              title="드래그하여 시간 변경"
                              className="absolute right-0 top-0 bottom-0 w-2.5 cursor-ew-resize hover:bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const originalEndTime = ev.endTime;

                                const onMouseMove = (moveEvent: MouseEvent) => {
                                  // Live feedback can be handled here if needed
                                };

                                const onMouseUp = async (upEvent: MouseEvent) => {
                                  window.removeEventListener('mousemove', onMouseMove);
                                  window.removeEventListener('mouseup', onMouseUp);

                                  const deltaX = upEvent.clientX - startX;
                                  // track width in px
                                  const trackEl = (e.target as HTMLElement).closest('.relative');
                                  if (trackEl && onEventResize) {
                                    const trackWidth = trackEl.getBoundingClientRect().width;
                                    const deltaPercent = (deltaX / trackWidth) * 100;
                                    const currentPos = computeEventPosition(ev.startTime, ev.endTime, timelineConfig);
                                    const newEndPercent = currentPos.leftPercent + currentPos.widthPercent + deltaPercent;
                                    const newEndTime = snapPercentToTime(newEndPercent, timelineConfig);

                                    if (newEndTime !== originalEndTime && newEndTime > ev.startTime) {
                                      await onEventResize(ev, { endTime: newEndTime });
                                    }
                                  }
                                };

                                window.addEventListener('mousemove', onMouseMove);
                                window.addEventListener('mouseup', onMouseUp);
                              }}
                            >
                              <div className="w-0.5 h-4 bg-slate-400 rounded-full" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
