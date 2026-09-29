import React, { useMemo } from 'react';
import { Calendar, Ticket } from 'lucide-react';
import { ScheduleService } from '@/core/services/scheduleService';
import { useStorageRefresh } from '@/hooks';
import { useApp } from '@/context/AppContext';
import type { Student } from '@/types';
import type { Booking } from '@/core/types/schedule';
import { BOOKING_STATUS_LABEL } from '@/core/schedules/bookingStatusLabel';
import { canCancelBookingAsParent } from '@/core/schedules/parentBookingCancelPolicy';
import { EmptyState } from '@/shared/components';
import { getPassRemaining, isPassUsable } from '@/core/schedules/sessionPassUtils';
import { SkinBookingRequestForm } from './SkinBookingRequestForm';

function canCancelRequest(booking: Booking, now: string): boolean {
  return canCancelBookingAsParent(booking, now);
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace('T', ' ');
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 예약형 고객 — 내 예약 + 이용권/관리권 잔여 */
export const PilatesParentBookingsView: React.FC<{
  student: Student;
  variant?: 'pilates' | 'skin';
}> = ({ student, variant = 'pilates' }) => {
  const skin = variant === 'skin';
  const passLabel = skin ? '관리권' : '이용권';
  const serviceFallback = skin ? '시술' : '수업';
  const { showToast } = useApp();
  const refreshKey = useStorageRefresh('bookings');
  const now = new Date().toISOString();

  const remaining = useMemo(
    () => ScheduleService.getCustomerRemainingSessions(student.id),
    [student.id, refreshKey]
  );

  const passes = useMemo(
    () =>
      ScheduleService.getCustomerSessionPasses(student.id).filter(
        (p) => p.status !== 'cancelled'
      ),
    [student.id, refreshKey]
  );

  const bookings = useMemo(
    () =>
      ScheduleService.getBookings()
        .filter((b) => b.customerId === student.id && b.status !== 'cancelled')
        .sort((a, b) => b.startsAt.localeCompare(a.startsAt)),
    [student.id, refreshKey]
  );

  const upcoming = bookings.filter((b) => b.startsAt >= now);
  const past = bookings.filter((b) => b.startsAt < now);

  return (
    <div className="space-y-4 pb-8">
      <div
        className={`rounded-2xl p-5 text-white ${
          skin
            ? 'bg-gradient-to-br from-rose-600 to-rose-800'
            : 'bg-gradient-to-br from-teal-600 to-cyan-700'
        }`}
      >
        <div className={`flex items-center gap-2 text-xs font-bold ${skin ? 'text-rose-100' : 'text-teal-100'}`}>
          <Ticket className="w-4 h-4" />
          {passLabel} 잔여
        </div>
        <p className="text-3xl font-black mt-1">{remaining}회</p>
        <p className={`text-xs mt-1 ${skin ? 'text-rose-100' : 'text-teal-100'}`}>
          {skin ? '시술' : '수업'} 완료 시 자동으로 1회 차감됩니다
        </p>
      </div>

      {skin && <SkinBookingRequestForm student={student} />}

      {passes.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-800">보유 {passLabel}</h3>
          {passes.map((pass) => (
            <div
              key={pass.id}
              className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between gap-2"
            >
              <div>
                <p className="text-sm font-bold text-slate-800">{pass.label}</p>
                <p className="text-[11px] text-slate-500">
                  {isPassUsable(pass) ? '사용 가능' : pass.status === 'exhausted' ? '소진' : '만료/불가'}
                  {pass.expiresAt ? ` · ~${pass.expiresAt.slice(0, 10)}` : ''}
                </p>
              </div>
              <p className={`text-sm font-black shrink-0 ${skin ? 'text-rose-700' : 'text-teal-700'}`}>
                {getPassRemaining(pass)}/{pass.totalSessions}
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <Calendar className={`w-4 h-4 ${skin ? 'text-rose-600' : 'text-teal-600'}`} />
          다가오는 예약
        </h3>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<Calendar className="w-8 h-8" />}
            title="예정된 예약이 없습니다"
            className="!p-6"
          />
        ) : (
          upcoming.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">{b.serviceName || serviceFallback}</p>
                {skin && b.waitlist && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 text-slate-600">대기</span>
                )}
                {skin && !b.waitlist && b.requestedBy === 'customer' && b.status === 'scheduled' && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700">신청</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {formatWhen(b.startsAt)}
                {b.staffName ? ` · ${b.staffName}` : ''}
              </p>
              {skin && b.depositStatus === 'pending' && (
                <button
                  type="button"
                  onClick={() => {
                    ScheduleService.saveBooking({ ...b, depositStatus: 'claimed' });
                    showToast('입금 표시를 남겼습니다. 샵에서 확인합니다.', 'info');
                  }}
                  className="mt-2 text-xs font-bold text-rose-700 min-h-[44px]"
                >
                  예약금 입금함
                </button>
              )}
              {skin && b.depositStatus === 'claimed' && (
                <p className="mt-1 text-[11px] text-slate-500">예약금 입금 확인 중</p>
              )}
              {skin && canCancelRequest(b, now) && (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      try {
                        await ScheduleService.cancelBookingAsParent(b.id);
                        showToast('예약 신청을 취소했습니다.', 'info');
                      } catch (err) {
                        showToast(
                          err instanceof Error ? err.message : '취소에 실패했습니다.',
                          'error'
                        );
                      }
                    })();
                  }}
                  className="mt-2 text-xs font-bold text-rose-600 min-h-[44px]"
                >
                  신청 취소
                </button>
              )}
            </div>
          ))
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-500">지난 예약</h3>
          {past.slice(0, 8).map((b) => (
            <div key={b.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-sm font-medium text-slate-700">{b.serviceName || serviceFallback}</p>
              <p className="text-[11px] text-slate-400 font-mono">
                {formatWhen(b.startsAt)} · {BOOKING_STATUS_LABEL[b.status]}
              </p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
};
