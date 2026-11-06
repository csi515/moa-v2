import React, { useMemo, type FC } from 'react';
import { DoorOpen, Plus, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { EmptyState } from '@/shared/components';
import {
  seoulDateFromIso,
  seoulTimeFromIso,
  type PracticeRoomRow,
  type RoomReservationRow,
} from '@/core/customer/services/practiceRoomReservationService';
import {
  WEEKDAY_KO,
  dayNumber,
  monthGridDates,
  type PracticeRoomCalendarMode,
  weekDates,
  weekdayLabel,
} from './practiceRoomCalendarUtils';

interface SlotPick {
  roomId?: string;
  roomName?: string;
  date: string;
  startTime: string;
  endTime: string;
}

interface Props {
  mode: PracticeRoomCalendarMode;
  selectedDate: string;
  rooms: PracticeRoomRow[];
  bookings: RoomReservationRow[];
  loading: boolean;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: SlotPick) => void;
  onCancelBooking: (row: RoomReservationRow) => void;
  canCreate: boolean;
}

function bookingsOnDate(bookings: RoomReservationRow[], date: string): RoomReservationRow[] {
  return bookings.filter((b) => seoulDateFromIso(b.starts_at) === date);
}

// 09:00 ~ 22:00 (30분 단위) 타임라인 슬롯 생성
const TIMELINE_SLOTS: string[] = [];
for (let h = 9; h <= 21; h += 1) {
  const hh = String(h).padStart(2, '0');
  TIMELINE_SLOTS.push(`${hh}:00`);
  TIMELINE_SLOTS.push(`${hh}:30`);
}
TIMELINE_SLOTS.push('22:00');

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nextH = Math.floor(total / 60) % 24;
  const nextM = total % 60;
  return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
}

export const PracticeRoomCalendarPanel: FC<Props> = ({
  mode,
  selectedDate,
  rooms,
  bookings,
  loading,
  onSelectDate,
  onSelectSlot,
  onCancelBooking,
  canCreate,
}) => {
  const activeRooms = useMemo(() => rooms.filter((r) => r.is_active), [rooms]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-white rounded-2xl border border-slate-200">
        <div className="inline-flex items-center gap-2 text-slate-500 text-sm">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          연습실 예약 현황을 불러오는 중...
        </div>
      </div>
    );
  }

  if (activeRooms.length === 0) {
    return (
      <EmptyState
        icon={<DoorOpen className="w-10 h-10 text-slate-400" />}
        title="등록된 연습실이 없습니다"
        description="관리자 설정에서 연습실(공간)을 등록하면 예약 캘린더를 사용할 수 있습니다."
      />
    );
  }

  // =========================================================================
  // 1. 일간(Day) 뷰: 룸(X축) × 09:00~22:00 타임라인(Y축) 매트릭스 그리드
  // =========================================================================
  if (mode === 'day') {
    const dayBookings = bookingsOnDate(bookings, selectedDate);

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-900">
              일간 타임라인 현황 · {selectedDate} ({weekdayLabel(selectedDate)})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            총 {activeRooms.length}개 룸 중 {dayBookings.length}건 예약
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 w-20 border-r border-slate-200">
                  시간
                </th>
                {activeRooms.map((room) => (
                  <th
                    key={room.id}
                    className="px-3 py-2.5 text-xs font-bold text-slate-800 border-r border-slate-200 last:border-r-0 min-w-[130px]"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{room.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIMELINE_SLOTS.slice(0, -1).map((slotTime) => {
                const nextSlotTime = addMinutesToTime(slotTime, 30);

                return (
                  <tr key={slotTime} className="hover:bg-slate-50/40 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-[11px] font-mono font-bold text-slate-500 border-r border-slate-200">
                      {slotTime}
                    </td>
                    {activeRooms.map((room) => {
                      // 이 슬롯과 겹치는 예약 탐색
                      const booking = dayBookings.find((b) => {
                        if (b.room_id !== room.id) return false;
                        const bStart = seoulTimeFromIso(b.starts_at);
                        const bEnd = seoulTimeFromIso(b.ends_at);
                        return slotTime >= bStart && slotTime < bEnd;
                      });

                      const isFirstSlotOfBooking =
                        booking && seoulTimeFromIso(booking.starts_at) === slotTime;

                      if (booking) {
                        return (
                          <td
                            key={room.id}
                            className="p-1 border-r border-slate-200 last:border-r-0 bg-indigo-50/50"
                          >
                            <div
                              onClick={() => onCancelBooking(booking)}
                              className="h-full min-h-[34px] px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold shadow-xs cursor-pointer flex flex-col justify-center transition-all"
                              title="클릭하여 예약 취소 또는 상세 확인"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="truncate">
                                  {booking.customers?.name || booking.memo || '예약됨'}
                                </span>
                                <span className="text-[9px] px-1 rounded bg-white/20 shrink-0">
                                  {booking.status === 'approved' ? '확정' : '대기'}
                                </span>
                              </div>
                              {isFirstSlotOfBooking && (
                                <span className="text-[10px] text-indigo-100 font-mono truncate">
                                  {seoulTimeFromIso(booking.starts_at)}~
                                  {seoulTimeFromIso(booking.ends_at)}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 빈 슬롯: 클릭 시 즉시 간이 예약 모달 호출
                      return (
                        <td
                          key={room.id}
                          className="p-1 border-r border-slate-200 last:border-r-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onSelectSlot({
                                roomId: room.id,
                                roomName: room.name,
                                date: selectedDate,
                                startTime: slotTime,
                                endTime: nextSlotTime,
                              })
                            }
                            className="w-full h-full min-h-[34px] rounded-lg border border-dashed border-transparent hover:border-indigo-300 hover:bg-indigo-50/40 text-transparent hover:text-indigo-600 flex items-center justify-center text-[11px] font-semibold transition-all cursor-pointer"
                            title={`${room.name} ${slotTime} 예약하기`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. 주간(Week) 뷰: 7개 요일(X축) × 09:00~22:00 타임라인(Y축) 매트릭스 그리드
  // =========================================================================
  if (mode === 'week') {
    const days = weekDates(selectedDate);

    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-black text-slate-900">
              주간 타임라인 스케줄러 · {days[0].slice(5)} ~ {days[6].slice(5)}
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-500">
            빈 칸을 클릭하면 해당 요일/시간대에 즉시 예약됩니다.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 px-2.5 py-2.5 text-[11px] font-bold text-slate-500 w-16 border-r border-slate-200">
                  시간
                </th>
                {days.map((date) => {
                  const isSelected = date === selectedDate;
                  const isSunday = weekdayLabel(date) === '일';
                  const isSaturday = weekdayLabel(date) === '토';
                  const dayBookingsCount = bookingsOnDate(bookings, date).length;

                  return (
                    <th
                      key={date}
                      onClick={() => onSelectDate(date)}
                      className={`px-2 py-2 text-center border-r border-slate-200 last:border-r-0 cursor-pointer transition-colors ${
                        isSelected ? 'bg-indigo-50/80' : 'hover:bg-slate-100/50'
                      }`}
                    >
                      <p
                        className={`text-xs font-black ${
                          isSunday
                            ? 'text-rose-600'
                            : isSaturday
                            ? 'text-indigo-600'
                            : 'text-slate-800'
                        }`}
                      >
                        {weekdayLabel(date)} ({dayNumber(date)})
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {dayBookingsCount > 0 ? `${dayBookingsCount}건 예약` : '공실 여유'}
                      </p>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TIMELINE_SLOTS.slice(0, -1).map((slotTime) => {
                const nextSlotTime = addMinutesToTime(slotTime, 30);

                return (
                  <tr key={slotTime} className="hover:bg-slate-50/30 transition-colors">
                    <td className="sticky left-0 z-10 bg-white px-2.5 py-1.5 text-[11px] font-mono font-bold text-slate-500 border-r border-slate-200">
                      {slotTime}
                    </td>
                    {days.map((date) => {
                      const dayBookings = bookingsOnDate(bookings, date);
                      const matchingBookings = dayBookings.filter((b) => {
                        const bStart = seoulTimeFromIso(b.starts_at);
                        const bEnd = seoulTimeFromIso(b.ends_at);
                        return slotTime >= bStart && slotTime < bEnd;
                      });

                      if (matchingBookings.length > 0) {
                        return (
                          <td
                            key={date}
                            className="p-1 border-r border-slate-200 last:border-r-0 bg-indigo-50/40 align-top"
                          >
                            <div className="space-y-1">
                              {matchingBookings.map((b) => (
                                <div
                                  key={b.id}
                                  onClick={() => onCancelBooking(b)}
                                  className="px-1.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-2xs cursor-pointer truncate transition-all"
                                  title={`${b.practice_rooms?.name || '연습실'} · ${
                                    b.customers?.name || b.memo || '예약'
                                  }`}
                                >
                                  <span className="font-extrabold mr-1">
                                    {b.practice_rooms?.name || '룸'}
                                  </span>
                                  <span>{b.customers?.name || b.memo || '예약'}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      }

                      // 빈 슬롯
                      return (
                        <td
                          key={date}
                          className="p-0.5 border-r border-slate-200 last:border-r-0"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onSelectSlot({
                                date,
                                startTime: slotTime,
                                endTime: nextSlotTime,
                              })
                            }
                            className="w-full h-full min-h-[32px] rounded border border-transparent hover:border-dashed hover:border-indigo-300 hover:bg-indigo-50/50 text-transparent hover:text-indigo-600 flex items-center justify-center text-[10px] transition-all cursor-pointer"
                            title={`${date} ${slotTime} 예약하기`}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 3. 월간(Month) 뷰: 7×5/6 달력 그리드 + 일자별 룸 점유 요약 및 공실 여부
  // =========================================================================
  const cells = monthGridDates(selectedDate);
  const totalRoomsCount = activeRooms.length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-black py-2.5">
        {WEEKDAY_KO.map((label, idx) => (
          <span
            key={label}
            className={idx === 0 ? 'text-rose-500' : idx === 6 ? 'text-indigo-600' : 'text-slate-600'}
          >
            {label}요일
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="min-h-[100px] bg-slate-50/40" />;
          }

          const dayRows = bookingsOnDate(bookings, date);
          const selected = date === selectedDate;
          const isSunday = weekdayLabel(date) === '일';
          const isSaturday = weekdayLabel(date) === '토';

          // 점유 룸 집합
          const occupiedRooms = new Set(dayRows.map((b) => b.room_id));
          const occupiedCount = occupiedRooms.size;
          const freeRoomsCount = Math.max(0, totalRoomsCount - occupiedCount);

          let statusBadgeText = '전실 공실';
          let statusBadgeClass =
            'bg-emerald-50 text-emerald-700 border-emerald-200';

          if (occupiedCount >= totalRoomsCount && totalRoomsCount > 0) {
            statusBadgeText = '예약 마감';
            statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
          } else if (occupiedCount > 0) {
            statusBadgeText = `${occupiedCount}실 사용 · ${freeRoomsCount}실 잔여`;
            statusBadgeClass =
              'bg-indigo-50 text-indigo-700 border-indigo-200';
          }

          return (
            <div
              key={date}
              onClick={() => onSelectDate(date)}
              className={`min-h-[100px] p-2 text-left align-top transition-all flex flex-col justify-between cursor-pointer ${
                selected
                  ? 'bg-indigo-50/70 ring-2 ring-indigo-600 ring-inset'
                  : 'hover:bg-slate-50/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-black ${
                      isSunday
                        ? 'text-rose-600'
                        : isSaturday
                        ? 'text-indigo-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {dayNumber(date)}
                  </span>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusBadgeClass}`}
                  >
                    {statusBadgeText}
                  </span>
                </div>

                {/* 점유 요약 리스트 */}
                <div className="mt-1.5 space-y-1">
                  {dayRows.slice(0, 3).map((b) => (
                    <div
                      key={b.id}
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold bg-slate-100 text-slate-700 truncate"
                      title={`${b.practice_rooms?.name || '연습실'} (${seoulTimeFromIso(
                        b.starts_at
                      )})`}
                    >
                      <span className="font-extrabold text-indigo-700 mr-1">
                        {b.practice_rooms?.name || '룸'}
                      </span>
                      <span>{seoulTimeFromIso(b.starts_at)}</span>
                    </div>
                  ))}
                  {dayRows.length > 3 && (
                    <p className="text-[9px] text-slate-400 font-bold px-1">
                      외 {dayRows.length - 3}건 더보기
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectDate(date);
                    onSelectSlot({
                      date,
                      startTime: '14:00',
                      endTime: '15:00',
                    });
                  }}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />
                  <span>예약</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
