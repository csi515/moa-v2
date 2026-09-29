import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { BookableSchedule, ReservationRequest } from '@/types';
import { reservationService } from '@/core/schedules';
import { Modal } from '@/shared/components/ui/Modal';
import { getPublicMyBookingsView } from './publicMyBookingsSlot';

interface ReservationModalProps {
  schedule: BookableSchedule;
  isAuthenticated: boolean;
  onClose: () => void;
  formatDateTime: (isoString: string) => string;
}

const EMPTY_BOOKING_FORM: Omit<ReservationRequest, 'schedule_id'> = {
  applicant_name: '',
  applicant_phone: '',
  applicant_email: '',
  request_message: '',
};

export function ReservationModal({
  schedule,
  isAuthenticated,
  onClose,
  formatDateTime,
}: ReservationModalProps) {
  const [bookingSubmitted, setBookingSubmitted] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(false);
  const [bookingForm, setBookingForm] =
    useState<Omit<ReservationRequest, 'schedule_id'>>(EMPTY_BOOKING_FORM);
  const MyBookings = getPublicMyBookingsView();

  // 슬롯 변경 시 기존 handleOpenBookingForm과 동일하게 폼·성공 상태 초기화
  useEffect(() => {
    setBookingForm(EMPTY_BOOKING_FORM);
    setBookingSubmitted(false);
    setShowMyReservations(false);
  }, [schedule.id]);

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      await reservationService.requestReservation({
        schedule_id: schedule.id,
        ...bookingForm,
      });
      setBookingSubmitted(true);
    } catch (err: unknown) {
      const errorMsg =
        err && typeof err === 'object' && 'message' in err && typeof err.message === 'string'
          ? err.message
          : '예약 신청에 실패했습니다';
      alert(errorMsg);
    }
  };

  const title = bookingSubmitted
    ? showMyReservations
      ? '내 예약'
      : '예약 신청 완료'
    : '예약 신청';

  return (
    <Modal isOpen onClose={onClose} title={title} maxWidth="lg">
        {bookingSubmitted ? (
          <div className="p-6 sm:p-8">
            {showMyReservations ? (
              <div className="space-y-4">
                <button
                    type="button"
                    onClick={() => setShowMyReservations(false)}
                    className="text-sm font-bold text-indigo-600 min-h-[44px]"
                  >
                    완료 화면
                  </button>
                {MyBookings ? <MyBookings /> : null}
              </div>
            ) : (
              <div className="text-center p-6 sm:p-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">예약 신청이 완료되었습니다</h3>
                <p className="text-slate-700 mb-2">담당자가 확인 후 승인하면 확정됩니다</p>
                <p className="text-sm text-slate-500 mb-6">
                  {isAuthenticated
                    ? '이 화면에서 신청한 예약을 확인할 수 있습니다'
                    : '로그인 후 내 예약에서 확인할 수 있습니다'}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors min-h-[44px]"
                  >
                    닫기
                  </button>
                  {isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setShowMyReservations(true)}
                      className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors min-h-[44px]"
                    >
                      내 예약 보기
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleBookingSubmit} className="p-6 space-y-6">
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-slate-900">{schedule.title}</h4>
              <p className="text-sm text-slate-600">{formatDateTime(schedule.starts_at)}</p>
              <p className="text-sm text-slate-600">잔여 {schedule.available_slots}자리</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.applicant_name}
                  onChange={(e) => setBookingForm({ ...bookingForm, applicant_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  연락처 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={bookingForm.applicant_phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, applicant_phone: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="010-0000-0000"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">이메일 (선택)</label>
                <input
                  type="email"
                  value={bookingForm.applicant_email}
                  onChange={(e) => setBookingForm({ ...bookingForm, applicant_email: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="예: name@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">요청사항 (선택)</label>
                <textarea
                  value={bookingForm.request_message}
                  onChange={(e) =>
                    setBookingForm({ ...bookingForm, request_message: e.target.value })
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="궁금한 사항이나 요청사항을 입력하세요"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors"
              >
                예약 신청
              </button>
            </div>
          </form>
        )}
    </Modal>
  );
}
