import { useMemo, useState } from 'react';
import { ScheduleService } from '@/core/services/scheduleService';
import { useApp } from '@/context/AppContext';
import { useStorageRefresh } from '@/hooks';
import { EmptyState } from '@/shared/components';
import type { Booking } from '@/core/types/schedule';
import { BOOKING_STATUS_LABEL } from '@/core/schedules/bookingStatusLabel';

/** 피부관리 고객 상세 — 시술 기록 */
export function SkinChartTab({ customerId }: { customerId: string }) {
  const { showToast } = useApp();
  const refreshKey = useStorageRefresh();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [skinCondition, setSkinCondition] = useState('');
  const [chartNote, setChartNote] = useState('');

  const bookings = useMemo(
    () =>
      ScheduleService.getBookings()
        .filter((b) => b.customerId === customerId && b.status !== 'cancelled')
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [customerId, refreshKey]
  );

  const startEdit = (booking: Booking) => {
    setEditingId(booking.id);
    setSkinCondition(booking.skinCondition || '');
    setChartNote(booking.chartNote || '');
  };

  const saveChart = (booking: Booking) => {
    ScheduleService.saveBooking({
      ...booking,
      skinCondition: skinCondition.trim() || undefined,
      chartNote: chartNote.trim() || undefined,
    });
    setEditingId(null);
    showToast('시술 기록이 저장되었습니다.', 'success');
  };

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="시술 기록이 없습니다"
        description="예약을 등록하면 이곳에 피부 상태와 시술 메모를 남길 수 있습니다."
      />
    );
  }

  return (
    <div className="space-y-3">
      {bookings.map((booking) => {
        const editing = editingId === booking.id;
        return (
          <div key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-slate-900">{booking.serviceName || '시술'}</p>
                <p className="text-[11px] text-slate-500">
                  {booking.startsAt.slice(0, 16).replace('T', ' ')}
                  {booking.staffName ? ` · ${booking.staffName}` : ''}
                  {booking.roomName ? ` · ${booking.roomName}` : ''}
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-700">
                {BOOKING_STATUS_LABEL[booking.status]}
              </span>
            </div>

            {editing ? (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  피부 상태
                  <input
                    value={skinCondition}
                    onChange={(e) => setSkinCondition(e.target.value)}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
                  />
                </label>
                <label className="block text-xs font-semibold text-slate-700">
                  시술 메모
                  <textarea
                    value={chartNote}
                    onChange={(e) => setChartNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => saveChart(booking)}
                    className="px-3 py-2 min-h-[44px] text-xs font-bold bg-rose-600 text-white rounded-xl"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="px-3 py-2 min-h-[44px] text-xs font-bold text-slate-600"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs text-slate-700">
                  <span className="font-bold">피부 상태 </span>
                  {booking.skinCondition || '미기록'}
                </p>
                <p className="text-xs text-slate-600 whitespace-pre-line">
                  {booking.chartNote || '시술 메모가 없습니다.'}
                </p>
                <button
                  type="button"
                  onClick={() => startEdit(booking)}
                  className="text-xs font-bold text-rose-600 min-h-[44px]"
                >
                  기록 수정
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
