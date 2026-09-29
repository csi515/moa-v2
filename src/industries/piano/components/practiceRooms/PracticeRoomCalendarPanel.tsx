import type { FC } from 'react';
import { DoorOpen } from 'lucide-react';
import { EmptyState } from '@/shared/components';
import {
  seoulDateFromIso,
  seoulTimeFromIso,
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

function statusLabel(status: string): string {
  if (status === 'pending') return '대기';
  if (status === 'approved') return '확정';
  return status;
}

interface Props {
  mode: PracticeRoomCalendarMode;
  selectedDate: string;
  bookings: RoomReservationRow[];
  loading: boolean;
  onSelectDate: (date: string) => void;
  onCreate: () => void;
  onCancel: (row: RoomReservationRow) => void;
  canCreate: boolean;
}

function bookingsOnDate(bookings: RoomReservationRow[], date: string): RoomReservationRow[] {
  return bookings.filter((b) => seoulDateFromIso(b.starts_at) === date);
}

/** 일/주/월 연습실 예약 캘린더 본문 */
export const PracticeRoomCalendarPanel: FC<Props> = ({
  mode,
  selectedDate,
  bookings,
  loading,
  onSelectDate,
  onCreate,
  onCancel,
  canCreate,
}) => {
  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-8">불러오는 중...</p>;
  }

  if (mode === 'day') {
    const dayBookings = bookingsOnDate(bookings, selectedDate);
    if (dayBookings.length === 0) {
      return (
        <EmptyState
          icon={<DoorOpen className="w-8 h-8" />}
          title="이날 연습실 예약이 없습니다"
          description="캘린더에서 날짜를 고른 뒤 예약을 추가해 보세요."
          action={
            <button
              type="button"
              onClick={onCreate}
              disabled={!canCreate}
              className="text-xs font-bold text-indigo-600 min-h-[44px] disabled:opacity-50"
            >
              예약하기
            </button>
          }
        />
      );
    }

    return (
      <ul className="space-y-2">
        {dayBookings.map((b) => (
          <li
            key={b.id}
            className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200 bg-white"
          >
            <div className="min-w-0">
              <p className="font-bold text-slate-900">
                {seoulTimeFromIso(b.starts_at)}–{seoulTimeFromIso(b.ends_at)} ·{' '}
                {b.practice_rooms?.name || '연습실'}
              </p>
              <p className="text-sm text-slate-600 mt-0.5">
                {b.customers?.name || '학생'}
                <span className="ml-1.5 text-[10px] font-bold text-slate-500">
                  {statusLabel(b.status)}
                </span>
              </p>
              {b.memo && <p className="text-[11px] text-slate-400 mt-0.5">{b.memo}</p>}
            </div>
            <button
              type="button"
              onClick={() => onCancel(b)}
              className="shrink-0 min-h-[44px] px-3 rounded-xl text-xs font-bold text-rose-600 border border-rose-100 hover:bg-rose-50"
            >
              취소
            </button>
          </li>
        ))}
      </ul>
    );
  }

  if (mode === 'week') {
    const days = weekDates(selectedDate);
    return (
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {days.map((date) => {
          const dayRows = bookingsOnDate(bookings, date);
          const selected = date === selectedDate;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`text-left rounded-2xl border p-2.5 min-h-[120px] transition-colors ${
                selected
                  ? 'border-indigo-400 bg-indigo-50/60 ring-2 ring-indigo-500 ring-inset'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`text-xs font-bold ${
                    weekdayLabel(date) === '일' ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  {weekdayLabel(date)} {dayNumber(date)}
                </span>
                {dayRows.length > 0 && (
                  <span className="text-[10px] font-bold text-indigo-600">{dayRows.length}</span>
                )}
              </div>
              <div className="space-y-1">
                {dayRows.length === 0 ? (
                  <p className="text-[10px] text-slate-400">예약 없음</p>
                ) : (
                  dayRows.slice(0, 4).map((b) => (
                    <div
                      key={b.id}
                      className={`rounded-lg px-1.5 py-1 text-[10px] font-bold truncate ${
                        b.status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                      title={`${seoulTimeFromIso(b.starts_at)} ${b.customers?.name || ''}`}
                    >
                      {seoulTimeFromIso(b.starts_at)} {b.customers?.name || '학생'}
                    </div>
                  ))
                )}
                {dayRows.length > 4 && (
                  <p className="text-[10px] text-slate-400">+{dayRows.length - 4}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // month
  const cells = monthGridDates(selectedDate);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-bold py-2">
        {WEEKDAY_KO.map((label, idx) => (
          <span key={label} className={idx === 0 ? 'text-rose-500' : 'text-slate-600'}>
            {label}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`empty-${idx}`} className="min-h-[72px] bg-slate-50/40" />;
          }
          const dayRows = bookingsOnDate(bookings, date);
          const selected = date === selectedDate;
          const isSunday = weekdayLabel(date) === '일';
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelectDate(date)}
              className={`min-h-[72px] p-1.5 text-left align-top transition-colors ${
                selected ? 'bg-indigo-50/70 ring-2 ring-indigo-600 ring-inset' : 'hover:bg-slate-50'
              }`}
            >
              <span
                className={`text-xs font-bold ${isSunday ? 'text-rose-600' : 'text-slate-700'}`}
              >
                {dayNumber(date)}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayRows.slice(0, 2).map((b) => (
                  <div
                    key={b.id}
                    className={`rounded px-1 py-0.5 text-[9px] font-bold truncate ${
                      b.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {seoulTimeFromIso(b.starts_at)} {b.customers?.name || ''}
                  </div>
                ))}
                {dayRows.length > 2 && (
                  <p className="text-[9px] text-slate-400 font-bold">+{dayRows.length - 2}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
