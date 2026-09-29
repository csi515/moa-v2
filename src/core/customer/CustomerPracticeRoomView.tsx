import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PracticeRoomStatusGrid } from './components/PracticeRoomStatusGrid';
import {
  practiceRoomReservationService,
  seoulDateFromIso,
  seoulTimeFromIso,
  type PracticeRoomRow,
  type RoomReservationRow,
  toSeoulIso,
} from './services/practiceRoomReservationService';

function statusLabel(status: string): string {
  if (status === 'pending') return '승인 대기';
  if (status === 'approved') return '승인됨';
  if (status === 'cancelled') return '취소됨';
  if (status === 'rejected') return '거절됨';
  if (status === 'completed') return '완료';
  return status;
}

function statusClass(status: string): string {
  if (status === 'pending') return 'bg-amber-50 text-amber-800';
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700';
  if (status === 'rejected') return 'bg-rose-50 text-rose-700';
  if (status === 'cancelled') return 'bg-slate-100 text-slate-500';
  return 'bg-slate-50 text-slate-600';
}

/** 성인 수강생 — 연습실 타임슬롯 신청 (호실×시간 현황 Grid) */
export function CustomerPracticeRoomView({ organizationId }: { organizationId: string }) {
  const [rooms, setRooms] = useState<PracticeRoomRow[]>([]);
  const [mine, setMine] = useState<RoomReservationRow[]>([]);
  const [dayBookings, setDayBookings] = useState<RoomReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roomId, setRoomId] = useState('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [memo, setMemo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === roomId) || rooms[0],
    [rooms, roomId]
  );

  const reloadMineAndRooms = useCallback(async () => {
    const [r, m] = await Promise.all([
      practiceRoomReservationService.listRooms(organizationId),
      practiceRoomReservationService.listMyReservations(organizationId),
    ]);
    setRooms(r.filter((x) => x.is_active));
    setMine(m);
    setRoomId((prev) => {
      if (prev && r.some((x) => x.id === prev && x.is_active)) return prev;
      return r.find((x) => x.is_active)?.id || '';
    });
  }, [organizationId]);

  const reloadDay = useCallback(async () => {
    try {
      const rows = await practiceRoomReservationService.listByDate(organizationId, date);
      setDayBookings(rows);
    } catch {
      setDayBookings([]);
    }
  }, [organizationId, date]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        await reloadMineAndRooms();
        if (!cancelled) await reloadDay();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '불러오기 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadMineAndRooms, reloadDay]);

  useEffect(() => {
    void reloadDay();
  }, [reloadDay]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;
    if (endTime <= startTime) {
      setError('종료 시간은 시작 시간보다 늦어야 합니다. (자정 넘김 불가)');
      return;
    }
    const open = String(selectedRoom.open_time).slice(0, 5);
    const close = String(selectedRoom.close_time).slice(0, 5);
    if (startTime < open || endTime > close) {
      setError(`운영 시간(${open}–${close}) 안에서만 예약할 수 있습니다.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await practiceRoomReservationService.request({
        organizationId,
        roomId: selectedRoom.id,
        startsAt: toSeoulIso(date, startTime),
        endsAt: toSeoulIso(date, endTime),
        memo,
      });
      setMemo('');
      setSuccess('예약 신청이 접수되었습니다. 승인 후 확정됩니다.');
      await Promise.all([reloadMineAndRooms(), reloadDay()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '신청 실패');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('이 예약을 취소할까요?')) return;
    try {
      await practiceRoomReservationService.cancel(id);
      setSuccess('예약을 취소했습니다.');
      await Promise.all([reloadMineAndRooms(), reloadDay()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소 실패');
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400 text-center py-8">연습실 불러오는 중...</p>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
          {error}
        </p>
      )}
      {success && (
        <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
          {success}
        </p>
      )}

      {rooms.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8 bg-white rounded-2xl border border-slate-200">
          등록된 연습실이 없습니다. 사업장에 문의해 주세요.
        </p>
      ) : (
        <>
          <label className="block text-xs font-semibold text-slate-700 bg-white rounded-2xl border border-slate-200 px-4 py-3">
            날짜
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[44px]"
            />
          </label>

          <PracticeRoomStatusGrid
            date={date}
            rooms={rooms}
            bookings={dayBookings}
            readOnlyOccupancy
            onPickFreeSlot={(pick) => {
              setRoomId(pick.roomId);
              setStartTime(pick.startTime);
              setEndTime(pick.endTime);
              setError(null);
              setSuccess(null);
            }}
          />

          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
          >
            <h2 className="text-sm font-black text-slate-900">예약 신청</h2>
            <p className="text-[11px] text-slate-500">
              위 현황판에서 빈 칸을 누르면 연습실·시간이 채워집니다.
            </p>
            <label className="block text-xs font-semibold text-slate-700">
              연습실
              <select
                value={selectedRoom?.id || ''}
                onChange={(e) => setRoomId(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold min-h-[44px]"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({String(r.open_time).slice(0, 5)}–{String(r.close_time).slice(0, 5)})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-slate-700">
                시작
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                />
              </label>
              <label className="block text-xs font-semibold text-slate-700">
                종료
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[44px]"
                />
              </label>
            </div>
            <input
              type="text"
              placeholder="메모 (선택)"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs min-h-[44px]"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] rounded-xl bg-indigo-600 text-white text-xs font-bold disabled:bg-slate-300"
            >
              {submitting ? '신청 중...' : '예약 신청'}
            </button>
          </form>
        </>
      )}

      <section className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
        <h2 className="text-sm font-black text-slate-900">내 예약</h2>
        {mine.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">예약 내역이 없습니다.</p>
        ) : (
          mine.map((r) => (
            <div
              key={r.id}
              className="flex items-start justify-between gap-2 py-2 border-b border-slate-50 text-sm"
            >
              <div>
                <p className="font-bold text-slate-800 flex flex-wrap items-center gap-2">
                  {r.practice_rooms?.name || '연습실'}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${statusClass(r.status)}`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </p>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  {seoulDateFromIso(r.starts_at)} {seoulTimeFromIso(r.starts_at)}–
                  {seoulTimeFromIso(r.ends_at)}
                </p>
                {r.status === 'rejected' && r.memo && (
                  <p className="text-[11px] text-rose-600 mt-1">사유 · {r.memo}</p>
                )}
              </div>
              {(r.status === 'pending' || r.status === 'approved') && (
                <button
                  type="button"
                  onClick={() => void handleCancel(r.id)}
                  className="text-xs font-bold text-rose-600 min-h-[44px] px-2"
                >
                  취소
                </button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
