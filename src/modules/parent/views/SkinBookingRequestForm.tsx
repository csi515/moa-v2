import { useState, type FormEvent } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useApp } from '@/context/AppContext';
import { ScheduleService } from '@/core/services/scheduleService';
import { StorageService } from '@/services/storage';
import { getSlotCapacityInfo } from '@/capabilities/scheduling/capacity';
import { isOutsideStaffHours } from '@/capabilities/scheduling/availability/windows';
import { formatBankAccountText } from '@/capabilities/finance/paymentMethodLabels';
import { findStaffTimeConflict } from '@/industries/skin/bookingRooms';
import type { Student } from '@/types';

/** 피부관리 고객 — 시술 예약 신청 */
export function SkinBookingRequestForm({ student }: { student: Student }) {
  const { showToast } = useApp();
  const [open, setOpen] = useState(false);
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('10:00');
  const [memo, setMemo] = useState('');
  const [waitlist, setWaitlist] = useState(false);
  const settings = StorageService.getSettings();
  const depositOn = settings.depositEnabled === true;
  const accountText = formatBankAccountText(settings.bankAccount);

  const services = ScheduleService.getActiveServiceOfferings();
  const staff = StorageService.getTeachers().filter((t) => t.status === 'active');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      showToast('시술을 선택해 주세요.', 'warning');
      return;
    }
    const startsAt = `${date}T${time}:00`;
    const instructor = staff.find((t) => t.id === staffId);
    const start = new Date(startsAt);
    const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);
    const endsAt = end.toISOString();
    if (instructor && isOutsideStaffHours({
      staffId: instructor.id,
      startsAt,
      endsAt,
      windows: settings.staffHours,
    })) {
      showToast('선택한 관리사의 근무시간이 아닙니다.', 'warning');
      return;
    }
    if (instructor && !waitlist) {
      const capacity = getSlotCapacityInfo({
        service,
        staffId: instructor.id,
        startsAt,
        bookings: ScheduleService.getBookings(),
        recruitments: ScheduleService.getSlotRecruitments(),
      });
      if (capacity.isClosed) {
        showToast('선택한 관리사 시간대는 예약할 수 없습니다.', 'warning');
        return;
      }
      const staffConflict = findStaffTimeConflict({
        staffId: instructor.id,
        startsAt,
        endsAt,
        bookings: ScheduleService.getBookings(),
      });
      if (staffConflict) {
        showToast('선택한 관리사는 이 시간에 이미 예약이 있습니다.', 'warning');
        return;
      }
    }
    ScheduleService.saveBooking({
      customerId: student.id,
      customerName: student.name,
      staffId: instructor?.id,
      staffName: instructor?.name,
      serviceId: service.id,
      serviceName: service.name,
      startsAt,
      endsAt,
      status: 'scheduled',
      requestedBy: 'customer',
      memo: memo.trim() || undefined,
      waitlist: waitlist || undefined,
      depositStatus: depositOn ? 'pending' : undefined,
    });
    setOpen(false);
    setMemo('');
    setWaitlist(false);
    showToast(
      waitlist
        ? '대기 신청이 접수되었습니다. 빈 시간이 나면 샵에서 연락합니다.'
        : '예약 신청이 접수되었습니다. 샵에서 확정하면 안내됩니다.',
      'success'
    );
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-3 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-bold"
      >
        예약 신청
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <h3 className="text-sm font-bold text-slate-900">예약 신청</h3>
      <label className="block text-xs font-semibold text-slate-700">
        시술 *
        <select
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
        >
          <option value="">선택</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.durationMinutes}분)
            </option>
          ))}
        </select>
      </label>
      <label className="block text-xs font-semibold text-slate-700">
        희망 관리사
        <select
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
        >
          <option value="">미지정</option>
          {staff.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold text-slate-700">
          날짜 *
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-700">
          시간 *
          <input
            type="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl min-h-[44px]"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={waitlist}
          onChange={(e) => setWaitlist(e.target.checked)}
        />
        대기 신청 (빈 시간에 연락)
      </label>
      {depositOn && (
        <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-3 space-y-2">
          <p className="text-xs font-bold text-rose-800">
            예약금 {Number(settings.depositAmount || 0).toLocaleString('ko-KR')}원 · 계좌이체
          </p>
          {accountText ? (
            <>
              <p className="text-sm font-semibold text-slate-900 break-all">{accountText}</p>
              <div className="flex justify-center bg-white rounded-xl p-2">
                <QRCodeSVG value={accountText} size={140} />
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-500">계좌가 아직 등록되지 않았습니다. 샵에 문의해 주세요.</p>
          )}
        </div>
      )}
      <label className="block text-xs font-semibold text-slate-700">
        요청 메모
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          className="mt-1 w-full px-3 py-2 text-sm border border-slate-200 rounded-xl"
        />
      </label>
      <div className="flex gap-2">
        <button type="submit" className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-rose-600 text-white text-sm font-bold">
          신청
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2.5 min-h-[44px] text-sm font-bold text-slate-600"
        >
          닫기
        </button>
      </div>
    </form>
  );
}
